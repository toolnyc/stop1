import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { normalizePhone } from '@/lib/phone';
import { withLogging } from '@/lib/api';
import { trackCall } from '@/lib/track';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Creates a Stripe Checkout Session for door payments.
 *
 * Body:
 *  - rsvpId?: string  — existing RSVP guest being marked arrived
 *  - name?: string    — walk-in guest name (creates RSVP on success)
 *  - phone?: string   — walk-in guest phone (optional)
 *
 * Returns: { url: string } — Stripe Checkout redirect URL
 */
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
  const { rsvpId, name, phone: rawPhone } = body;

  if (!rsvpId && !name) {
    return new Response(JSON.stringify({ error: 'rsvpId or name required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title, door_price, slug')
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
  const phone = rawPhone ? normalizePhone(rawPhone) : '';

  // Build the success/cancel URLs
  const origin = new URL(request.url).origin;
  const baseUrl = `${origin}/door/${slug}/checkin`;

  // Build success URL — {CHECKOUT_SESSION_ID} must stay unencoded for Stripe to replace it
  const extraParams = new URLSearchParams();
  if (rsvpId) {
    extraParams.set('rsvp_id', rsvpId);
  } else {
    extraParams.set('walkin_name', name.trim());
    if (phone) extraParams.set('walkin_phone', phone);
  }
  const extraStr = extraParams.toString();
  const successUrl = `${baseUrl}?session_id={CHECKOUT_SESSION_ID}${extraStr ? '&' + extraStr : ''}`;

  const result = await trackCall({
    service: 'stripe',
    action: 'create-checkout-session',
    meta: { slug, amount, rsvpId: rsvpId || null },
    log,
    fn: () =>
      stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: amount,
              product_data: {
                name: `Door — ${event.title}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          event_id: event.id,
          slug: event.slug,
          rsvp_id: rsvpId || '',
          walkin_name: rsvpId ? '' : name.trim(),
          walkin_phone: rsvpId ? '' : phone,
        },
        success_url: successUrl,
        cancel_url: baseUrl,
      }),
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ url: result.data.url }), {
    status: 200,
    headers: JSON_HEADERS,
  });
});
