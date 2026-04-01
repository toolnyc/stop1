import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const GET = withLogging(async ({ params, url, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const { slug } = params;
  const q = url.searchParams.get('q') || '';

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

  const trimmed = q.trim();
  const isSearch = !!trimmed;

  let query = supabaseAdmin
    .from('rsvps')
    .select('id, name, email, phone, arrived_at, walk_in')
    .eq('event_id', event.id)
    .order('name')
    .limit(isSearch ? 20 : 50);

  if (isSearch) {
    if (/^[+\d]/.test(trimmed)) {
      query = query.ilike('phone', `%${trimmed}%`);
    } else {
      query = query.ilike('name', `%${trimmed}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    log.error('search.failed', { slug, error: error.message });
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify(data ?? []), {
    status: 200,
    headers: {
      ...JSON_HEADERS,
      'Cache-Control': 'private, no-cache',
    },
  });
});
