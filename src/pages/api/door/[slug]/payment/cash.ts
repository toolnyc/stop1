import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ params, request }) => {
  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = params;
  const body = await request.json();
  const { amount, rsvpId, name } = body;

  if (!amount || amount <= 0) {
    return new Response(JSON.stringify({ error: 'Amount is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Look up event
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', slug!)
    .single();

  if (!event) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Insert door payment
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
    console.error('Cash payment error:', error);
    return new Response(JSON.stringify({ error: 'Failed to record payment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Mark arrived if rsvpId provided
  if (rsvpId) {
    await supabaseAdmin
      .from('rsvps')
      .update({ arrived_at: new Date().toISOString() })
      .eq('id', rsvpId)
      .eq('event_id', event.id);
  }

  return new Response(JSON.stringify({ success: true, payment: data }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
