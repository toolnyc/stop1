import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { withLogging } from '@/lib/api';

export const POST = withLogging(async ({ request, cookies, redirect, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = request.headers.get('content-type') || '';
  let body: Record<string, string>;

  if (contentType.includes('application/json')) {
    body = await request.json();
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries()) as Record<string, string>;
  }

  const { title, slug, date, time_end, venue_name, venue_address, description, door_price, door_pin, capacity, status } = body;

  const errors: string[] = [];
  if (!title) errors.push('Title is required');
  if (!slug) errors.push('Slug is required');
  if (!date) errors.push('Date is required');
  if (!door_pin) errors.push('Door PIN is required');

  if (errors.length > 0) {
    if (!contentType.includes('application/json')) {
      return redirect(`/admin/events/new?field_error=${encodeURIComponent(errors.join(', '))}`);
    }
    return new Response(JSON.stringify({ error: errors.join(', '), fields: errors }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const doorPinHash = await bcrypt.hash(door_pin, 10);

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      title,
      slug,
      date,
      time_end: time_end || null,
      venue_name: venue_name || null,
      venue_address: venue_address || null,
      description: description || null,
      door_price: parseFloat(door_price) || 0,
      door_pin: doorPinHash,
      capacity: capacity ? parseInt(capacity) : null,
      status: (status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      if (!contentType.includes('application/json')) {
        return redirect(`/admin/events/new?error=${encodeURIComponent('Slug already taken')}`);
      }
      return new Response(JSON.stringify({ error: 'Slug already taken' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    log.error('event.create_failed', { slug, error: error.message, code: error.code });
    if (!contentType.includes('application/json')) {
      return redirect(`/admin/events/new?error=${encodeURIComponent('Failed to create event')}`);
    }
    return new Response(JSON.stringify({ error: 'Failed to create event' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  log.info('event.created', { slug: data.slug });

  if (!contentType.includes('application/json')) {
    return redirect(`/admin/events/${data.slug}`);
  }

  return new Response(JSON.stringify({ success: true, event: data }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
});
