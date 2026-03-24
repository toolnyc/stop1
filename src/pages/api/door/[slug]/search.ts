import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const GET: APIRoute = async ({ params, url }) => {
  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = params;
  const q = url.searchParams.get('q') || '';

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

  let query = supabaseAdmin
    .from('rsvps')
    .select('id, name, email, phone, arrived_at, walk_in')
    .eq('event_id', event.id)
    .order('name')
    .limit(20);

  if (q.trim()) {
    query = query.ilike('name', `%${q.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data ?? []), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
