import { supabaseAdmin } from '@/lib/supabase';
import { resend } from '@/lib/resend';
import { dayOfReminderEmail } from '@/lib/emails/day-of-reminder';
import { withLogging } from '@/lib/api';
import { trackCall, maskEmail } from '@/lib/track';
import { EVENT_TIMEZONE } from '@/lib/constants';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const POST = withLogging(async ({ params, cookies, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const { slug } = params;

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title, date, venue_name, venue_address, reminder_email_sent_at')
    .eq('slug', slug!)
    .single();

  if (!event) {
    log.warn('event_not_found', { slug });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  if (event.reminder_email_sent_at) {
    return new Response(
      JSON.stringify({
        error: `Already sent on ${new Date(event.reminder_email_sent_at).toLocaleDateString('en-US', { timeZone: EVENT_TIMEZONE })}`,
      }),
      {
        status: 409,
        headers: JSON_HEADERS,
      },
    );
  }

  if (!resend) {
    log.error('resend_not_configured');
    return new Response(JSON.stringify({ error: 'Email not configured' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const { data: rsvps } = await supabaseAdmin
    .from('rsvps')
    .select('name, email')
    .eq('event_id', event.id)
    .not('email', 'is', null);

  const rsvpList = rsvps ?? [];
  let sent = 0;
  let failed = 0;

  log.info('reminders.email_batch_start', { slug, total: rsvpList.length });

  const promises = rsvpList.map(async (rsvp) => {
    const emailData = dayOfReminderEmail(rsvp.name, rsvp.email, event);
    const result = await trackCall({
      service: 'resend',
      action: 'send-reminder-email',
      meta: { to: maskEmail(rsvp.email), slug },
      log,
      fn: () => resend.emails.send(emailData),
    });

    if (result.ok) sent++;
    else failed++;
  });

  await Promise.all(promises);

  log.info('reminders.email_batch_done', { slug, sent, failed, total: rsvpList.length });

  await supabaseAdmin
    .from('events')
    .update({ reminder_email_sent_at: new Date().toISOString() })
    .eq('id', event.id);

  return new Response(JSON.stringify({ success: true, sent, failed }), {
    status: 200,
    headers: JSON_HEADERS,
  });
});
