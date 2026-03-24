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
  const { rsvpId } = body;

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, door_price, slug')
    .eq('slug', slug!)
    .single();

  if (!event) {
    log.warn('event_not_found', { slug });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  const amount = Math.round(Number(event.door_price) * 100);

  const result = await trackCall({
    service: 'stripe',
    action: 'create-payment-intent',
    meta: { slug, amount, rsvpId: rsvpId || null },
    log,
    fn: () => stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        event_id: event.id,
        slug: event.slug,
        rsvp_id: rsvpId || '',
      },
    }),
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create payment' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ clientSecret: result.data.client_secret }), {
    status: 200,
    headers: JSON_HEADERS,
  });
});
