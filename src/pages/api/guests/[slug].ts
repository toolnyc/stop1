import { supabaseAdmin } from '@/lib/supabase';

export const GET = async ({ params }: { params: { slug?: string } }) => {
  const JSON_HEADERS = { 'Content-Type': 'application/json' };

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const { slug } = params;

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', slug!)
    .eq('status', 'published')
    .single();

  if (!event) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  const { data: rsvps } = await supabaseAdmin
    .from('rsvps')
    .select('name, created_at')
    .eq('event_id', event.id)
    .eq('walk_in', false)
    .order('created_at', { ascending: true });

  const guests = (rsvps ?? []).map((r) => ({ name: r.name }));

  return new Response(JSON.stringify({ guests }), {
    status: 200,
    headers: {
      ...JSON_HEADERS,
      'Cache-Control': 'no-store',
    },
  });
};
