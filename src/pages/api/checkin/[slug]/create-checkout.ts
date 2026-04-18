import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { withLogging } from '@/lib/api';
import { trackCall } from '@/lib/track';
import { getEffectivePrice } from '@/lib/pricing';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const limiter = new RateLimiter(5, 60_000);

export const POST = withLogging(async ({ params, request, log }) => {
  if (!supabaseAdmin || !stripe) {
    log.error('config_missing', { supabase: !!supabaseAdmin, stripe: !!stripe });
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = limiter.check(ip);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        ...JSON_HEADERS,
        'Retry-After': String(Math.ceil((retryAfterMs ?? 60_000) / 1000)),
      },
    });
  }
  limiter.hit(ip);

  const { slug } = params;
  const body = await request.json();
  const { rsvpId, simulate: rawSimulate } = body as { rsvpId?: string; simulate?: string };
  const simulate = import.meta.env.PROD ? undefined : rawSimulate;

  if (!rsvpId) {
    return new Response(JSON.stringify({ error: 'rsvpId required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title, slug, door_price, early_price, early_cutoff')
    .eq('slug', slug!)
    .eq('status', 'published')
    .single();

  if (!event) {
    log.warn('event_not_found', { slug });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  // Verify RSVP exists and not already arrived
  const { data: rsvp } = await supabaseAdmin
    .from('rsvps')
    .select('id, name, arrived_at')
    .eq('id', rsvpId)
    .eq('event_id', event.id)
    .single();

  if (!rsvp) {
    return new Response(JSON.stringify({ error: 'Guest not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  if (rsvp.arrived_at) {
    return new Response(JSON.stringify({ error: 'Already checked in' }), {
      status: 409,
      headers: JSON_HEADERS,
    });
  }

  const { price: realPrice, isEarly } = getEffectivePrice(event);
  const effectivePrice =
    simulate === 'paid' && realPrice === 0 ? (event.door_price ?? 10) : realPrice;
  const unitAmount = Math.round(effectivePrice * 100);

  if (unitAmount <= 0) {
    return new Response(JSON.stringify({ error: 'No payment required for free events' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  log.info('self_checkin.price_resolved', { slug, effectivePrice, isEarly });

  const origin = new URL(request.url).origin;
  const successParams = new URLSearchParams({ rsvp_id: rsvpId });
  const successUrl = `${origin}/checkin/${slug}/confirmed?session_id={CHECKOUT_SESSION_ID}&${successParams.toString()}`;

  const result = await trackCall({
    service: 'stripe',
    action: 'self-checkin-checkout',
    meta: { slug, unitAmount, rsvpId },
    log,
    fn: () =>
      stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: unitAmount,
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
          rsvp_id: rsvpId,
          source: 'self_checkin',
        },
        success_url: successUrl,
        cancel_url: origin,
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
