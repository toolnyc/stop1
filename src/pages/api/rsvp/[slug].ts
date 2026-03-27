import { supabaseAdmin } from '@/lib/supabase';
import { resend } from '@/lib/resend';
import { rsvpConfirmationEmail } from '@/lib/emails/rsvp-confirmation';
import { normalizePhone } from '@/lib/phone';
import { sendSms } from '@/lib/sms';
import { rsvpConfirmationSms } from '@/lib/sms/rsvp-confirmation';
import { withLogging } from '@/lib/api';
import { trackCall, maskEmail } from '@/lib/track';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const POST = withLogging(async ({ params, request, log, background }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: JSON_HEADERS,
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
    log.warn('event_not_found', { slug, error: eventError?.message });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
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
      headers: JSON_HEADERS,
    });
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    log.warn('invalid_phone', { rawPhone: rawPhone.slice(0, 4) + '***' });
    return new Response(JSON.stringify({ error: 'A valid phone number is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  // Email is optional — validate format only if provided
  const email = rawEmail.trim() ? rawEmail.trim().toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email format' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  log.info('rsvp.inserting', { slug, sms_opt_in, hasEmail: !!email });

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
      log.info('rsvp.duplicate', { slug, phone: phone.slice(-4) });
      return new Response(JSON.stringify({ error: "You're already on the list!" }), {
        status: 409,
        headers: JSON_HEADERS,
      });
    }
    log.error('rsvp.insert_failed', { slug, error: error.message, code: error.code });
    return new Response(JSON.stringify({ error: 'Failed to submit RSVP' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  log.info('rsvp.created', { slug, rsvpId: data.id });

  // Background SMS confirmation — kept alive via waitUntil on Vercel
  if (sms_opt_in) {
    const smsBody = rsvpConfirmationSms(name.trim(), event);
    background(
      sendSms(phone, smsBody, { action: 'send-rsvp-confirmation', log }).then((result) => {
        if (!result.ok) {
          log.error('rsvp.sms_failed', { slug, rsvpId: data.id, error: result.error });
        }
      }),
    );
  }

  // Background email confirmation — kept alive via waitUntil on Vercel
  if (resend && email) {
    const emailData = rsvpConfirmationEmail(name.trim(), email, event);
    background(
      trackCall({
        service: 'resend',
        action: 'send-rsvp-confirmation',
        meta: { to: maskEmail(email), slug },
        log,
        fn: () => resend.emails.send(emailData),
      }).then((result) => {
        if (!result.ok) {
          log.error('rsvp.email_failed', { slug, rsvpId: data.id, error: result.error });
        }
      }),
    );
  }

  return new Response(JSON.stringify({ success: true, rsvp: data }), {
    status: 201,
    headers: JSON_HEADERS,
  });
});
