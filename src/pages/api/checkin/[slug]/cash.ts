import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';
import { getEffectivePrice } from '@/lib/pricing';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const limiter = new RateLimiter(10, 60_000);

export const POST = withLogging(async ({ params, request, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
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
  const { rsvpId } = body as { rsvpId?: string };

  if (!rsvpId) {
    return new Response(JSON.stringify({ error: 'rsvpId required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, door_price, early_price, early_cutoff')
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

  const { price: effectivePrice } = getEffectivePrice(event);
  const now = new Date().toISOString();

  // Record payment if price > 0
  if (effectivePrice > 0) {
    const { error: payError } = await supabaseAdmin.from('door_payments').insert({
      event_id: event.id,
      rsvp_id: rsvpId,
      amount: effectivePrice,
      method: 'cash' as const,
    });

    if (payError) {
      log.error('payment.cash_failed', { slug, error: payError.message, code: payError.code });
      return new Response(JSON.stringify({ error: 'Failed to record payment' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  }

  // Mark arrived
  const { error: arriveError } = await supabaseAdmin
    .from('rsvps')
    .update({ arrived_at: now })
    .eq('id', rsvpId)
    .eq('event_id', event.id);

  if (arriveError) {
    log.error('arrive.update_failed', { slug, rsvpId, error: arriveError.message });
    return new Response(JSON.stringify({ error: 'Failed to mark arrived' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  log.info('self_checkin.cash', { slug, rsvpId, amount: effectivePrice });

  return new Response(
    JSON.stringify({
      success: true,
      guestName: rsvp.name,
      amount: effectivePrice,
      method: effectivePrice > 0 ? 'cash' : 'free',
      timestamp: now,
    }),
    { status: 201, headers: JSON_HEADERS },
  );
});
