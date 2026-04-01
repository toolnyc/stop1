import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Marks arrival for some or all members of a party.
 *
 * Body:
 *  - rsvpId: string         — the primary RSVP
 *  - checkInPrimary: boolean — whether the primary is arriving now
 *  - checkInGuests: number  — how many anonymous guests are arriving now
 */
export const POST = withLogging(async ({ params, request, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const { slug } = params;
  const body = await request.json();
  const { rsvpId, checkInPrimary, checkInGuests } = body as {
    rsvpId: string;
    checkInPrimary: boolean;
    checkInGuests: number;
  };

  if (!rsvpId) {
    return new Response(JSON.stringify({ error: 'rsvpId is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', slug!)
    .single();

  if (!event) {
    log.warn('event_not_found', { slug });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  const { data: rsvp, error: fetchError } = await supabaseAdmin
    .from('rsvps')
    .select('id, arrived_at, plus_one_count, plus_ones_arrived')
    .eq('id', rsvpId)
    .eq('event_id', event.id)
    .single();

  if (fetchError || !rsvp) {
    log.warn('arrive_party.rsvp_not_found', { slug, rsvpId });
    return new Response(JSON.stringify({ error: 'RSVP not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  const guestsToAdd = Math.min(
    Math.max(0, Math.floor(checkInGuests ?? 0)),
    rsvp.plus_one_count - rsvp.plus_ones_arrived,
  );

  const updates: Record<string, unknown> = {};

  if (checkInPrimary && !rsvp.arrived_at) {
    updates.arrived_at = new Date().toISOString();
  }

  if (guestsToAdd > 0) {
    updates.plus_ones_arrived = rsvp.plus_ones_arrived + guestsToAdd;
  }

  if (Object.keys(updates).length === 0) {
    // Nothing to update — idempotent success
    return new Response(JSON.stringify({ success: true, rsvp }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('rsvps')
    .update(updates)
    .eq('id', rsvpId)
    .eq('event_id', event.id)
    .select()
    .single();

  if (updateError) {
    log.error('arrive_party.update_failed', { slug, rsvpId, error: updateError.message });
    return new Response(JSON.stringify({ error: 'Failed to mark arrival' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  log.info('arrive_party.marked', { slug, rsvpId, checkInPrimary, guestsToAdd });

  return new Response(JSON.stringify({ success: true, rsvp: updated }), {
    status: 200,
    headers: JSON_HEADERS,
  });
});
