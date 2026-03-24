import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { resend } from '@/lib/resend';
import { rsvpConfirmationEmail } from '@/lib/emails/rsvp-confirmation';
import { normalizePhone } from '@/lib/phone';
import { sendSms } from '@/lib/sms';
import { rsvpConfirmationSms } from '@/lib/sms/rsvp-confirmation';

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
    .select('id, status, title, date, venue_name')
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
  let name: string, rawPhone: string, rawEmail: string, sms_opt_in: boolean;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    name = body.name;
    rawPhone = body.phone || '';
    rawEmail = body.email || '';
    sms_opt_in = body.sms_opt_in !== false; // default true
  } else {
    const formData = await request.formData();
    name = formData.get('name') as string;
    rawPhone = (formData.get('phone') as string) || '';
    rawEmail = (formData.get('email') as string) || '';
    sms_opt_in = formData.get('sms_opt_in') !== 'false'; // default true
  }

  // Validation
  if (!name || !name.trim()) {
    return new Response(JSON.stringify({ error: 'Name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return new Response(JSON.stringify({ error: 'A valid phone number is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Email is optional — validate format only if provided
  const email = rawEmail.trim() ? rawEmail.trim().toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('rsvps')
    .insert({
      event_id: event.id,
      name: name.trim(),
      email,
      phone,
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

  // Fire-and-forget SMS confirmation
  if (sms_opt_in) {
    const smsBody = rsvpConfirmationSms(name.trim(), event);
    sendSms(phone, smsBody).catch(err => console.error('[twilio]', err));
  }

  // Fire-and-forget email confirmation (if email provided)
  if (resend && email) {
    const emailData = rsvpConfirmationEmail(name.trim(), email, event);
    resend.emails.send(emailData).catch(err => console.error('[resend]', err));
  }

  return new Response(JSON.stringify({ success: true, rsvp: data }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
