import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';
import { normalizePhone } from '@/lib/phone';

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
  // amount: total charged (unit_price × count for parties)
  // rsvpId: present for existing RSVP guests
  // checkInPrimary / checkInGuests: party arrival breakdown (optional, defaults to solo)
  // name: walk-in only
  const {
    rsvpId,
    name,
    phone: rawPhone,
    checkInPrimary = true,
    checkInGuests = 0,
  } = body as {
    rsvpId?: string;
    name?: string;
    phone?: string;
    checkInPrimary?: boolean;
    checkInGuests?: number;
  };

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, door_price')
    .eq('slug', slug!)
    .single();

  if (!event) {
    log.warn('event_not_found', { slug });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  const quantity = (checkInPrimary ? 1 : 0) + Math.max(0, checkInGuests);
  const serverAmount = quantity * Number(event.door_price);

  const { data, error } = await supabaseAdmin
    .from('door_payments')
    .insert({
      event_id: event.id,
      rsvp_id: rsvpId || null,
      amount: serverAmount,
      method: 'cash' as const,
      name: rsvpId ? null : name || null,
    })
    .select()
    .single();

  if (error) {
    log.error('payment.cash_failed', { slug, error: error.message, code: error.code });
    return new Response(JSON.stringify({ error: 'Failed to record payment' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  // Mark arrival — solo RSVP or party subset via arrive-party logic
  if (rsvpId) {
    if (checkInGuests > 0) {
      // Party check-in: delegate to arrive-party update
      const { data: rsvp } = await supabaseAdmin
        .from('rsvps')
        .select('arrived_at, plus_ones_arrived, plus_one_count')
        .eq('id', rsvpId)
        .eq('event_id', event.id)
        .single();

      if (rsvp) {
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
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin
            .from('rsvps')
            .update(updates)
            .eq('id', rsvpId)
            .eq('event_id', event.id);
        }
      }
    } else {
      // Solo check-in: just mark arrived
      await supabaseAdmin
        .from('rsvps')
        .update({ arrived_at: new Date().toISOString() })
        .eq('id', rsvpId)
        .eq('event_id', event.id);
    }
  }

  // Walk-in: create RSVP atomically so the client doesn't need a second call
  if (!rsvpId && name) {
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    const { data: newRsvp } = await supabaseAdmin
      .from('rsvps')
      .insert({
        event_id: event.id,
        name: name.trim(),
        email: null,
        phone: phone || null,
        sms_opt_in: !!phone,
        walk_in: true,
        arrived_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    // Update payment to link to new RSVP
    if (newRsvp) {
      await supabaseAdmin.from('door_payments').update({ rsvp_id: newRsvp.id }).eq('id', data.id);
    }
  }

  log.info('payment.cash_recorded', { slug, paymentId: data.id, rsvpId, checkInGuests });

  return new Response(JSON.stringify({ success: true, payment: data }), {
    status: 201,
    headers: JSON_HEADERS,
  });
});
