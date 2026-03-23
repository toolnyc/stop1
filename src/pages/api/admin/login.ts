import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!supabaseAdmin) {
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
    // Form submission → redirect back with error
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
    maxAge: 60 * 60 * 24, // 1 day
  });

  cookies.set('sb-refresh-token', data.session.refresh_token, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  if (!contentType.includes('application/json')) {
    return redirect('/admin');
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
