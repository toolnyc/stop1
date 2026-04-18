import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { log } from '@/lib/logger';
import { sendDiscordAlert } from '@/lib/discord';

const WEBHOOK_SECRET = import.meta.env.STRIPE_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
  if (!stripe || !supabaseAdmin || !WEBHOOK_SECRET) {
    log.error('stripe_webhook.config_missing', {
      stripe: !!stripe,
      supabase: !!supabaseAdmin,
      secret: !!WEBHOOK_SECRET,
    });
    return new Response('Server configuration error', { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    log.warn('stripe_webhook.sig_invalid', {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    await handleChargeRefunded(charge);
  }

  return new Response('ok', { status: 200 });
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return;

  const meta = session.metadata ?? {};
  const eventId = meta.event_id;
  const rsvpId = meta.rsvp_id;
  const slug = meta.slug ?? 'unknown';
  const source = meta.source ?? 'unknown';

  if (!eventId || !rsvpId) {
    log.warn('stripe_webhook.missing_metadata', { sessionId: session.id, meta });
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Prevent double-processing
  if (paymentIntentId) {
    const { count } = await supabaseAdmin!
      .from('door_payments')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_payment_intent_id', paymentIntentId);

    if (count && count > 0) {
      log.info('stripe_webhook.already_processed', { paymentIntentId, slug });
      return;
    }
  }

  const totalAmount = Number(session.amount_total ?? 0) / 100;

  // Record payment
  const { error: payError } = await supabaseAdmin!.from('door_payments').insert({
    event_id: eventId,
    rsvp_id: rsvpId,
    amount: totalAmount,
    method: 'card' as const,
    stripe_payment_intent_id: paymentIntentId,
  });

  if (payError) {
    // FK violation (23503) means the RSVP was deleted between checkout creation
    // and webhook delivery. Record the payment without the rsvp link so revenue
    // is never lost — it can be reconciled manually.
    if (payError.code === '23503') {
      log.warn('stripe_webhook.rsvp_missing_fallback', { slug, rsvpId });
      const { error: retryError } = await supabaseAdmin!.from('door_payments').insert({
        event_id: eventId,
        rsvp_id: null,
        amount: totalAmount,
        method: 'card' as const,
        stripe_payment_intent_id: paymentIntentId,
        name: `[orphaned rsvp ${rsvpId}]`,
      });

      if (retryError) {
        log.error('stripe_webhook.payment_insert_retry_failed', {
          slug,
          rsvpId,
          error: retryError.message,
          code: retryError.code,
        });
      } else {
        await sendDiscordAlert({
          title: '⚠️ Orphaned Payment Recorded',
          message: `Payment saved without RSVP link (RSVP was deleted)`,
          fields: [
            { name: 'Event', value: slug },
            { name: 'Amount', value: `$${totalAmount.toFixed(2)}` },
            { name: 'Original RSVP', value: rsvpId },
            { name: 'Source', value: source },
          ],
          level: 'warn',
        });
      }
      return;
    }

    log.error('stripe_webhook.payment_insert_failed', {
      slug,
      rsvpId,
      error: payError.message,
      code: payError.code,
    });
    await sendDiscordAlert({
      title: '🔴 Webhook Error',
      message: `Payment insert failed: ${payError.message}`,
      fields: [
        { name: 'Event', value: slug },
        { name: 'Amount', value: `$${totalAmount.toFixed(2)}` },
        { name: 'Source', value: source },
      ],
      level: 'error',
    });
    return;
  }

  // Mark arrived
  const { error: arriveError } = await supabaseAdmin!
    .from('rsvps')
    .update({ arrived_at: new Date().toISOString() })
    .eq('id', rsvpId)
    .eq('event_id', eventId)
    .is('arrived_at', null);

  if (arriveError) {
    log.error('stripe_webhook.arrive_failed', {
      slug,
      rsvpId,
      error: arriveError.message,
    });
  }

  // Look up guest name for alert
  const { data: rsvp } = await supabaseAdmin!
    .from('rsvps')
    .select('name')
    .eq('id', rsvpId)
    .single();

  log.info('stripe_webhook.checkin_complete', {
    slug,
    rsvpId,
    amount: totalAmount,
    source,
  });

  await sendDiscordAlert({
    title: '🎟️ Ticket Purchase',
    message: `Card payment confirmed via webhook`,
    fields: [
      { name: 'Name', value: rsvp?.name ?? 'Unknown' },
      { name: 'Event', value: slug },
      { name: 'Amount', value: `$${totalAmount.toFixed(2)}` },
      { name: 'Source', value: source },
    ],
    level: 'warn',
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : (charge.payment_intent?.id ?? null);

  if (!paymentIntentId) {
    log.warn('stripe_webhook.refund_no_pi', { chargeId: charge.id });
    return;
  }

  // Find the original door_payment to get event_id and rsvp_id
  const { data: original } = await supabaseAdmin!
    .from('door_payments')
    .select('event_id, rsvp_id, name, amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .eq('method', 'card')
    .single();

  if (!original) {
    log.warn('stripe_webhook.refund_no_original', { paymentIntentId });
    return;
  }

  const refundedAmount = Number(charge.amount_refunded) / 100;

  // Check if we already recorded a refund for this PI
  const { data: existingRefund } = await supabaseAdmin!
    .from('door_payments')
    .select('id, amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .eq('method', 'refund' as const)
    .single();

  if (existingRefund) {
    // Update existing refund row for partial→full refund scenarios
    const existingAbs = Math.abs(Number(existingRefund.amount));
    if (existingAbs >= refundedAmount) {
      log.info('stripe_webhook.refund_already_recorded', { paymentIntentId });
      return;
    }
    await supabaseAdmin!
      .from('door_payments')
      .update({ amount: -refundedAmount })
      .eq('id', existingRefund.id);
  } else {
    // Insert negative-amount adjustment row
    const { error: refundError } = await supabaseAdmin!.from('door_payments').insert({
      event_id: original.event_id,
      rsvp_id: original.rsvp_id,
      amount: -refundedAmount,
      method: 'refund' as const,
      stripe_payment_intent_id: paymentIntentId,
      name: original.name,
    });

    if (refundError) {
      log.error('stripe_webhook.refund_insert_failed', {
        paymentIntentId,
        error: refundError.message,
        code: refundError.code,
      });
      return;
    }
  }

  // Look up event slug for alert
  const { data: evt } = await supabaseAdmin!
    .from('events')
    .select('slug')
    .eq('id', original.event_id)
    .single();

  // Look up guest name
  let guestName = original.name ?? 'Unknown';
  if (!original.name && original.rsvp_id) {
    const { data: rsvp } = await supabaseAdmin!
      .from('rsvps')
      .select('name')
      .eq('id', original.rsvp_id)
      .single();
    guestName = rsvp?.name ?? 'Unknown';
  }

  const isPartial = refundedAmount < Number(original.amount);

  log.info('stripe_webhook.refund_recorded', {
    slug: evt?.slug,
    paymentIntentId,
    refundedAmount,
    originalAmount: original.amount,
    partial: isPartial,
  });

  await sendDiscordAlert({
    title: `💸 ${isPartial ? 'Partial ' : ''}Refund Processed`,
    message: `Card payment refunded via Stripe`,
    fields: [
      { name: 'Name', value: guestName },
      { name: 'Event', value: evt?.slug ?? 'unknown' },
      { name: 'Refund', value: `$${refundedAmount.toFixed(2)}` },
      ...(isPartial ? [{ name: 'Original', value: `$${Number(original.amount).toFixed(2)}` }] : []),
    ],
    level: 'warn',
  });
}
