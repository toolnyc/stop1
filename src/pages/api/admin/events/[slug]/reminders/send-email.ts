import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { resend } from '@/lib/resend';
import { dayOfReminderEmail } from '@/lib/emails/day-of-reminder';

export const POST: APIRoute = async ({ params, cookies, redirect }) => {
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

  // Look up event
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title, date, venue_name, venue_address, reminder_email_sent_at')
    .eq('slug', slug!)
    .single();

  if (!event) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Already sent check
  if (event.reminder_email_sent_at) {
    return new Response(JSON.stringify({
      error: `Already sent on ${new Date(event.reminder_email_sent_at).toLocaleDateString()}`,
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!resend) {
    return new Response(JSON.stringify({ error: 'Email not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get all RSVPs
  const { data: rsvps } = await supabaseAdmin
    .from('rsvps')
    .select('name, email')
    .eq('event_id', event.id);

  const rsvpList = rsvps ?? [];
  let sent = 0;
  let failed = 0;

  // Send emails in parallel batches
  const promises = rsvpList.map(async (rsvp) => {
    try {
      const emailData = dayOfReminderEmail(rsvp.name, rsvp.email, event);
      await resend.emails.send(emailData);
      sent++;
    } catch (err) {
      console.error(`[resend] Failed to send to ${rsvp.email}:`, err);
      failed++;
    }
  });

  await Promise.all(promises);

  // Mark as sent
  await supabaseAdmin
    .from('events')
    .update({ reminder_email_sent_at: new Date().toISOString() })
    .eq('id', event.id);

  return new Response(JSON.stringify({ success: true, sent, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
