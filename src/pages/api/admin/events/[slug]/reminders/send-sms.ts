import { supabaseAdmin } from '@/lib/supabase';
import { sendSms } from '@/lib/sms';
import { withLogging } from '@/lib/api';

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
    .select('id, title, date, venue_name, reminder_sms_sent_at')
    .eq('slug', slug!)
    .single();

  if (!event) {
    log.warn('event_not_found', { slug });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  if (event.reminder_sms_sent_at) {
    return new Response(JSON.stringify({
      error: `Already sent on ${new Date(event.reminder_sms_sent_at).toLocaleDateString()}`,
    }), {
      status: 409,
      headers: JSON_HEADERS,
    });
  }

  // Get opt-in RSVPs (phone is now NOT NULL)
  const { data: rsvps } = await supabaseAdmin
    .from('rsvps')
    .select('name, phone')
    .eq('event_id', event.id)
    .eq('sms_opt_in', true);

  const rsvpList = rsvps ?? [];

  const time = new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const venue = event.venue_name || 'TBA';
  const body = `Tonight! ${event.title} @ ${venue}, ${time}. See you there 🖤`;

  let sent = 0;
  let failed = 0;

  log.info('reminders.sms_batch_start', { slug, total: rsvpList.length });

  for (const rsvp of rsvpList) {
    const result = await sendSms(rsvp.phone!, body, {
      action: 'send-reminder-sms',
      log,
    });
    if (result.ok) sent++;
    else failed++;
  }

  log.info('reminders.sms_batch_done', { slug, sent, failed, total: rsvpList.length });

  await supabaseAdmin
    .from('events')
    .update({ reminder_sms_sent_at: new Date().toISOString() })
    .eq('id', event.id);

  return new Response(JSON.stringify({ success: true, sent, skipped: failed }), {
    status: 200,
    headers: JSON_HEADERS,
  });
});
