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
