import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { withLogging } from '@/lib/api';

export const POST = withLogging(async ({ params, request, cookies, redirect, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response('Server configuration error', { status: 500 });
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return redirect('/admin/login');
  }

  const { slug } = params;
  const formData = await request.formData();

  const title = formData.get('title') as string;
  const date = formData.get('date') as string;
  const time_end = formData.get('time_end') as string;
  const venue_name = formData.get('venue_name') as string;
  const venue_address = formData.get('venue_address') as string;
  const description = formData.get('description') as string;
  const door_price = formData.get('door_price') as string;
  const door_pin = formData.get('door_pin') as string;
  const capacity = formData.get('capacity') as string;
  const status = formData.get('status') as string;

  if (!title || !date) {
    return redirect(`/admin/events/${slug}?error=${encodeURIComponent('Title and date are required')}`);
  }

  const updates: Record<string, unknown> = {
    title,
    date,
    time_end: time_end || null,
    venue_name: venue_name || null,
    venue_address: venue_address || null,
    description: description || null,
    door_price: parseFloat(door_price) || 0,
    capacity: capacity ? parseInt(capacity) : null,
    status: status === 'published' ? 'published' : 'draft',
    updated_at: new Date().toISOString(),
  };

  if (door_pin && door_pin.trim()) {
    updates.door_pin = await bcrypt.hash(door_pin.trim(), 10);
  }

  const { error } = await supabaseAdmin
    .from('events')
    .update(updates)
    .eq('slug', slug!);

  if (error) {
    log.error('event.update_failed', { slug, error: error.message, code: error.code });
    return redirect(`/admin/events/${slug}?error=${encodeURIComponent('Failed to update event')}`);
  }

  log.info('event.updated', { slug });
  return redirect(`/admin/events/${slug}?success=${encodeURIComponent('Event updated')}`);
});
