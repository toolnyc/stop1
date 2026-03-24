import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSms } from '@/lib/sms';

export const POST: APIRoute = async ({ params, cookies }) => {
  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = params;

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title, date, venue_name, reminder_sms_sent_at')
    .eq('slug', slug!)
    .single();

  if (!event) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (event.reminder_sms_sent_at) {
    return new Response(JSON.stringify({
      error: `Already sent on ${new Date(event.reminder_sms_sent_at).toLocaleDateString()}`,
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
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
  let skipped = 0;

  for (const rsvp of rsvpList) {
    const ok = await sendSms(rsvp.phone!, body);
    if (ok) sent++;
    else skipped++;
  }

  await supabaseAdmin
    .from('events')
    .update({ reminder_sms_sent_at: new Date().toISOString() })
    .eq('id', event.id);

  return new Response(JSON.stringify({ success: true, sent, skipped }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
