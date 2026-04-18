import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';
import { RateLimiter, getClientIp } from '@/lib/rate-limit';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const limiter = new RateLimiter(120, 60_000);

function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export const GET = withLogging(async ({ params, url, request, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = limiter.check(ip);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        ...JSON_HEADERS,
        'Retry-After': String(Math.ceil((retryAfterMs ?? 60_000) / 1000)),
      },
    });
  }
  limiter.hit(ip);

  const { slug } = params;
  const q = url.searchParams.get('q') || '';

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', slug!)
    .eq('status', 'published')
    .single();

  if (!event) {
    log.warn('event_not_found', { slug });
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  const trimmed = q.trim();
  if (!trimmed) {
    return new Response(JSON.stringify([]), { status: 200, headers: JSON_HEADERS });
  }

  // Split into tokens so "Jo Sm" matches "John Smith"
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  let query = supabaseAdmin
    .from('rsvps')
    .select('id, name')
    .eq('event_id', event.id)
    .is('arrived_at', null);

  for (const token of tokens) {
    query = query.ilike('name', `%${escapeIlike(token)}%`);
  }

  const { data, error } = await query.order('name').limit(20);

  if (error) {
    log.error('search.failed', { slug, error: error.message });
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  return new Response(JSON.stringify(data ?? []), {
    status: 200,
    headers: { ...JSON_HEADERS, 'Cache-Control': 'private, no-cache' },
  });
});
