import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';
import { normalizePhone } from '@/lib/phone';
import { getEffectivePrice } from '@/lib/pricing';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const limiter = new RateLimiter(5, 60_000);

interface WalkinBody {
  name?: string;
  phone?: string;
  email?: string;
  simulate?: string;
}

/**
 * Creates a walk-in RSVP and optionally records a cash payment.
 * For card payments, the client creates the RSVP here first (with method=pending),
 * then calls create-checkout with the returned rsvpId.
 *
 * Body: { name, phone?, email?, simulate? }
 * Query: ?method=cash|pending (default: cash for free/cash, pending for card pre-step)
 */
export const POST = withLogging(async ({ params, request, url, log }) => {
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
  const body = (await request.json()) as WalkinBody;
  const { name, phone, email, simulate } = body;
  const method = url.searchParams.get('method') ?? 'cash';

  if (!name?.trim()) {
    return new Response(JSON.stringify({ error: 'Name is required' }), {
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

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const walkinEmail = email?.trim() || `walkin-${Date.now()}@walk.in`;

  // Create walk-in RSVP
  const { price: realPrice } = getEffectivePrice(event);
  const effectivePrice =
    simulate === 'paid' && realPrice === 0 ? (event.door_price ?? 10) : realPrice;
  const isFree = effectivePrice === 0;
  const markArrived = isFree || method === 'cash';

  const { data: rsvp, error: insertError } = await supabaseAdmin
    .from('rsvps')
    .insert({
      event_id: event.id,
      name: name.trim(),
      email: walkinEmail,
      phone: normalizedPhone,
      sms_opt_in: !!normalizedPhone,
      walk_in: true,
      arrived_at: markArrived ? new Date().toISOString() : null,
    })
    .select('id, name')
    .single();

  if (insertError || !rsvp) {
    log.error('walkin.insert_failed', { slug, error: insertError?.message });
    return new Response(JSON.stringify({ error: 'Failed to create walk-in' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  // Record cash payment if applicable
  if (method === 'cash' && effectivePrice > 0) {
    const { error: payError } = await supabaseAdmin.from('door_payments').insert({
      event_id: event.id,
      rsvp_id: rsvp.id,
      amount: effectivePrice,
      method: 'cash' as const,
      name: name.trim(),
    });

    if (payError) {
      log.error('walkin.cash_failed', { slug, rsvpId: rsvp.id, error: payError.message });
      return new Response(JSON.stringify({ error: 'Failed to record payment' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  }

  log.info('walkin.created', {
    slug,
    rsvpId: rsvp.id,
    method,
    amount: effectivePrice,
    free: isFree,
  });

  return new Response(
    JSON.stringify({
      success: true,
      rsvpId: rsvp.id,
      guestName: rsvp.name,
      amount: effectivePrice,
      method: isFree ? 'free' : method,
    }),
    { status: 201, headers: JSON_HEADERS },
  );
});
