import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { createHmac } from 'node:crypto';

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  if (!supabaseAdmin) {
    return new Response('Server configuration error', { status: 500 });
  }

  const { slug } = params;
  const cookieSecret = import.meta.env.COOKIE_SECRET;

  if (!cookieSecret) {
    return new Response('Server configuration error: missing COOKIE_SECRET', { status: 500 });
  }

  // Get PIN from form or JSON
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

  // Look up event
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('door_pin')
    .eq('slug', slug!)
    .single();

  if (error || !event || !event.door_pin) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Compare PIN
  const valid = await bcrypt.compare(pin, event.door_pin);
  if (!valid) {
    if (!contentType.includes('application/json')) {
      return redirect(`/door/${slug}/pin?error=${encodeURIComponent('Incorrect PIN')}`);
    }
    return new Response(JSON.stringify({ error: 'Incorrect PIN' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Set door session cookie
  const sig = createHmac('sha256', cookieSecret).update(slug!).digest('hex');
  cookies.set(`door_session_${slug}`, sig, {
    path: `/door/${slug}`,
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    maxAge: 60 * 60 * 12, // 12 hours
  });

  if (!contentType.includes('application/json')) {
    return redirect(`/door/${slug}/checkin`);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
