import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';

const loginLimiter = new RateLimiter(5, 15 * 60 * 1000);

export const POST = withLogging(async ({ request, cookies, redirect, log }) => {
  const ip = getClientIp(request);
  const rlCheck = loginLimiter.check(ip);
  if (!rlCheck.allowed) {
    log.warn('login.rate_limited', { ip });
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Too many login attempts. Try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rlCheck.retryAfterMs || 0) / 1000)),
        },
      });
    }
    return redirect('/admin/login?error=Too many login attempts. Try again later.');
  }
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let email: string;
  let password: string;

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json();
    email = body.email;
    password = body.password;
  } else {
    const formData = await request.formData();
    email = formData.get('email') as string;
    password = formData.get('password') as string;
  }

  if (!email || !password) {
    if (!contentType.includes('application/json')) {
      return redirect('/admin/login?error=Email and password are required');
    }
    return new Response(JSON.stringify({ error: 'Email and password are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    loginLimiter.hit(ip);
    log.warn('login.failed', { email: email.split('@')[0] + '@***' });
    if (!contentType.includes('application/json')) {
      return redirect('/admin/login?error=Invalid email or password');
    }
    return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isSecure = import.meta.env.PROD;

  cookies.set('sb-access-token', data.session.access_token, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
  });

  cookies.set('sb-refresh-token', data.session.refresh_token, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  log.info('login.success');

  if (!contentType.includes('application/json')) {
    return redirect('/admin');
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
