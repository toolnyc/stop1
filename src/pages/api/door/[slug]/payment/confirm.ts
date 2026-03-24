import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { withLogging } from '@/lib/api';
import { trackCall } from '@/lib/track';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const POST = withLogging(async ({ params, request, log }) => {
  if (!supabaseAdmin || !stripe) {
    log.error('config_missing', { supabase: !!supabaseAdmin, stripe: !!stripe });
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const { slug } = params;
  const body = await request.json();
  const { paymentIntentId, rsvpId, name } = body;

  if (!paymentIntentId) {
    return new Response(JSON.stringify({ error: 'Payment intent ID required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const verifyResult = await trackCall({
    service: 'stripe',
    action: 'verify-payment-intent',
    meta: { paymentIntentId },
    log,
    fn: () => stripe.paymentIntents.retrieve(paymentIntentId),
  });

  if (!verifyResult.ok) {
    return new Response(JSON.stringify({ error: 'Failed to verify payment' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  if (verifyResult.data.status !== 'succeeded') {
    log.warn('payment.not_succeeded', { paymentIntentId, status: verifyResult.data.status });
    return new Response(JSON.stringify({ error: 'Payment not succeeded' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, door_price')
    .eq('slug', slug!)
    .single();

  if (!event) {
    log.warn('event_not_found', { slug });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('door_payments')
    .insert({
      event_id: event.id,
      rsvp_id: rsvpId || null,
      amount: Number(event.door_price),
      method: 'card' as const,
      stripe_payment_intent_id: paymentIntentId,
      name: rsvpId ? null : (name || null),
    })
    .select()
    .single();

  if (error) {
    log.error('payment.record_failed', { slug, error: error.message, code: error.code });
    return new Response(JSON.stringify({ error: 'Failed to record payment' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  if (rsvpId) {
    await supabaseAdmin
      .from('rsvps')
      .update({ arrived_at: new Date().toISOString() })
      .eq('id', rsvpId)
      .eq('event_id', event.id);
  }

  log.info('payment.card_recorded', { slug, paymentId: data.id });

  return new Response(JSON.stringify({ success: true, payment: data }), {
    status: 201,
    headers: JSON_HEADERS,
  });
});
