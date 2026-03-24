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
  const { amount, rsvpId, name } = body;

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
      amount: parseFloat(amount),
      method: 'cash' as const,
      name: rsvpId ? null : (name || null),
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

  if (rsvpId) {
    await supabaseAdmin
      .from('rsvps')
      .update({ arrived_at: new Date().toISOString() })
      .eq('id', rsvpId)
      .eq('event_id', event.id);
  }

  log.info('payment.cash_recorded', { slug, paymentId: data.id });

  return new Response(JSON.stringify({ success: true, payment: data }), {
    status: 201,
    headers: JSON_HEADERS,
  });
});
