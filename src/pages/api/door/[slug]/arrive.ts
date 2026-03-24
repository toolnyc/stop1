import { supabaseAdmin } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';
import { withLogging } from '@/lib/api';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

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
  const { rsvpId, name, phone: rawPhone } = body;

  // Look up event
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

  // Walk-in: create RSVP + mark arrived
  if (!rsvpId && name) {
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    const { data: newRsvp, error: insertError } = await supabaseAdmin
      .from('rsvps')
      .insert({
        event_id: event.id,
        name: name.trim(),
        email: null,
        phone: phone || `+0000000${Date.now()}`,
        sms_opt_in: !!phone,
        walk_in: true,
        arrived_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      log.error('walkin.insert_failed', { slug, error: insertError.message, code: insertError.code });
      return new Response(JSON.stringify({ error: 'Failed to add walk-in' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    log.info('walkin.created', { slug, rsvpId: newRsvp.id });
    return new Response(JSON.stringify({ success: true, rsvp: newRsvp }), {
      status: 201,
      headers: JSON_HEADERS,
    });
  }

  // Mark existing RSVP as arrived (idempotent)
  if (rsvpId) {
    const { error } = await supabaseAdmin
      .from('rsvps')
      .update({ arrived_at: new Date().toISOString() })
      .eq('id', rsvpId)
      .eq('event_id', event.id);

    if (error) {
      log.error('arrive.update_failed', { slug, rsvpId, error: error.message });
      return new Response(JSON.stringify({ error: 'Failed to mark arrived' }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    log.info('arrive.marked', { slug, rsvpId });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify({ error: 'rsvpId or name required' }), {
    status: 400,
    headers: JSON_HEADERS,
  });
});
