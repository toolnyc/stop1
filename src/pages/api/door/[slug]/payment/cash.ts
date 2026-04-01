import { supabaseAdmin } from '@/lib/supabase';
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
  // amount: total charged (unit_price × count for parties)
  // rsvpId: present for existing RSVP guests
  // checkInPrimary / checkInGuests: party arrival breakdown (optional, defaults to solo)
  // name: walk-in only
  const {
    amount,
    rsvpId,
    name,
    checkInPrimary = true,
    checkInGuests = 0,
  } = body as {
    amount: number;
    rsvpId?: string;
    name?: string;
    checkInPrimary?: boolean;
    checkInGuests?: number;
  };

  if (!amount || amount <= 0) {
    return new Response(JSON.stringify({ error: 'Amount is required' }), {
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

  const { data, error } = await supabaseAdmin
    .from('door_payments')
    .insert({
      event_id: event.id,
      rsvp_id: rsvpId || null,
      amount: parseFloat(String(amount)),
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
        .select('arrived_at, plus_ones_arrived')
        .eq('id', rsvpId)
        .eq('event_id', event.id)
        .single();

      if (rsvp) {
        const updates: Record<string, unknown> = {};
        if (checkInPrimary && !rsvp.arrived_at) {
          updates.arrived_at = new Date().toISOString();
        }
        if (checkInGuests > 0) {
          updates.plus_ones_arrived = rsvp.plus_ones_arrived + checkInGuests;
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

  log.info('payment.cash_recorded', { slug, paymentId: data.id, rsvpId, checkInGuests });

  return new Response(JSON.stringify({ success: true, payment: data }), {
    status: 201,
    headers: JSON_HEADERS,
  });
});
