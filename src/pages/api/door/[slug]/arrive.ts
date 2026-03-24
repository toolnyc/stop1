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
  const { rsvpId, name, email } = body;

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

  // Walk-in: create RSVP + mark arrived
  if (!rsvpId && name) {
    const { data: newRsvp, error: insertError } = await supabaseAdmin
      .from('rsvps')
      .insert({
        event_id: event.id,
        name: name.trim(),
        email: (email || `walkin-${Date.now()}@stop1.party`).trim().toLowerCase(),
        walk_in: true,
        arrived_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Walk-in insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to add walk-in' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, rsvp: newRsvp }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
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
      console.error('Arrive error:', error);
      return new Response(JSON.stringify({ error: 'Failed to mark arrived' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'rsvpId or name required' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
};
