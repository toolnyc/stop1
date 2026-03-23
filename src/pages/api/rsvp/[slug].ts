import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ params, request }) => {
  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = params;

  // Look up event
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, status')
    .eq('slug', slug!)
    .eq('status', 'published')
    .single();

  if (eventError || !event) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = request.headers.get('content-type') || '';
  let name: string, email: string, phone: string, sms_opt_in: boolean;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    name = body.name;
    email = body.email;
    phone = body.phone || '';
    sms_opt_in = body.sms_opt_in || false;
  } else {
    const formData = await request.formData();
    name = formData.get('name') as string;
    email = formData.get('email') as string;
    phone = (formData.get('phone') as string) || '';
    sms_opt_in = formData.get('sms_opt_in') === 'true';
  }

  // Validation
  if (!name || !name.trim()) {
    return new Response(JSON.stringify({ error: 'Name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email || !email.trim()) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('rsvps')
    .insert({
      event_id: event.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      sms_opt_in,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ error: "You're already on the list!" }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('RSVP insert error:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit RSVP' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TODO: fire-and-forget email via Resend (issue #24)
  console.log(`RSVP confirmation: ${name} (${email}) for event ${slug}`);

  return new Response(JSON.stringify({ success: true, rsvp: data }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
