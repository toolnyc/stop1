import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

export const POST: APIRoute = async ({ params, request }) => {
  if (!supabaseAdmin || !stripe) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = params;
  const body = await request.json();
  const { rsvpId } = body;

  // Look up event
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, door_price, slug')
    .eq('slug', slug!)
    .single();

  if (!event) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const amount = Math.round(Number(event.door_price) * 100); // cents

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: {
      event_id: event.id,
      slug: event.slug,
      rsvp_id: rsvpId || '',
    },
  });

  return new Response(JSON.stringify({ clientSecret: intent.client_secret }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
