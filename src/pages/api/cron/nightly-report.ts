import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { log } from '@/lib/logger';

const DISCORD_WEBHOOK_URL = import.meta.env.DISCORD_WEBHOOK_URL;
const CRON_SECRET = import.meta.env.CRON_SECRET;

export const GET: APIRoute = async ({ request }) => {
  // Verify Vercel cron secret
  const auth = request.headers.get('authorization');
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!supabaseAdmin) {
    log.error('cron.nightly_report.supabase_missing');
    return new Response('Server error', { status: 500 });
  }

  if (!DISCORD_WEBHOOK_URL) {
    log.error('cron.nightly_report.discord_webhook_missing');
    return new Response('Server error', { status: 500 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // All published events with total RSVP counts
  const { data: events, error: eventsError } = await supabaseAdmin
    .from('events')
    .select('id, title, slug, date, rsvps(count)')
    .eq('status', 'published')
    .order('date', { ascending: true });

  if (eventsError) {
    log.error('cron.nightly_report.events_failed', { error: eventsError.message });
    return new Response('Query error', { status: 500 });
  }

  // New RSVPs in the last 24h
  const { data: newRsvps, error: rsvpsError } = await supabaseAdmin
    .from('rsvps')
    .select('event_id, name')
    .gte('created_at', since);

  if (rsvpsError) {
    log.error('cron.nightly_report.rsvps_failed', { error: rsvpsError.message });
    return new Response('Query error', { status: 500 });
  }

  const newByEvent: Record<string, number> = {};
  for (const r of newRsvps ?? []) {
    newByEvent[r.event_id] = (newByEvent[r.event_id] ?? 0) + 1;
  }

  const totalNew = newRsvps?.length ?? 0;

  // Build Discord embed fields per event
  const fields = (events ?? []).map((event) => {
    const total = (event.rsvps as unknown as { count: number }[])?.[0]?.count ?? 0;
    const newCount = newByEvent[event.id] ?? 0;
    const eventDate = new Date(event.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return {
      name: `${event.title} (${eventDate})`,
      value: `**${total}** total · **+${newCount}** new`,
      inline: false,
    };
  });

  if (fields.length === 0) {
    fields.push({ name: 'No active events', value: 'No published events found.', inline: false });
  }

  const embed = {
    title: '📋 Stop One — Nightly RSVP Report',
    color: totalNew > 0 ? 0x57f287 : 0x99aab5, // green if new RSVPs, grey if quiet
    fields,
    footer: { text: `${totalNew} new RSVP${totalNew !== 1 ? 's' : ''} in the last 24h` },
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    const text = await res.text();
    log.error('cron.nightly_report.discord_failed', { status: res.status, body: text });
    return new Response('Discord error', { status: 500 });
  }

  log.info('cron.nightly_report.sent', { totalNew, events: events?.length ?? 0 });
  return new Response(JSON.stringify({ ok: true, totalNew }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
