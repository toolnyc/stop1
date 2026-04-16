import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { createHmac } from 'node:crypto';
import { withLogging } from '@/lib/api';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';

const pinLimiter = new RateLimiter(5, 15 * 60 * 1000);

export const POST = withLogging(async ({ params, request, cookies, redirect, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response('Server configuration error', { status: 500 });
  }

  const { slug } = params;
  const cookieSecret = import.meta.env.COOKIE_SECRET;

  if (!cookieSecret) {
    log.error('cookie_secret_missing');
    return new Response('Server configuration error: missing COOKIE_SECRET', { status: 500 });
  }

  const rateLimitKey = `pin:${getClientIp(request)}:${slug}`;
  const rlCheck = pinLimiter.check(rateLimitKey);
  if (!rlCheck.allowed) {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Too many attempts. Try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rlCheck.retryAfterMs || 0) / 1000)),
        },
      });
    }
    return redirect(
      `/door/${slug}/pin?error=${encodeURIComponent('Too many attempts. Try again later.')}`,
    );
  }

  let pin: string;
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    pin = body.pin;
  } else {
    const formData = await request.formData();
    pin = formData.get('pin') as string;
  }

  if (!pin) {
    if (!contentType.includes('application/json')) {
      return redirect(`/door/${slug}/pin?error=${encodeURIComponent('PIN is required')}`);
    }
    return new Response(JSON.stringify({ error: 'PIN is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('door_pin')
    .eq('slug', slug!)
    .single();

  if (error || !event || !event.door_pin) {
    log.warn('event_not_found', { slug });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const valid = await bcrypt.compare(pin, event.door_pin);
  if (!valid) {
    pinLimiter.hit(rateLimitKey);
    log.warn('door.pin_invalid', { slug });
    if (!contentType.includes('application/json')) {
      return redirect(`/door/${slug}/pin?error=${encodeURIComponent('Incorrect PIN')}`);
    }
    return new Response(JSON.stringify({ error: 'Incorrect PIN' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sig = createHmac('sha256', cookieSecret).update(slug!).digest('hex');
  cookies.set(`door_session_${slug}`, sig, {
    path: `/door/${slug}`,
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
  });

  log.info('door.authenticated', { slug });

  if (!contentType.includes('application/json')) {
    return redirect(`/door/${slug}/checkin`);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
