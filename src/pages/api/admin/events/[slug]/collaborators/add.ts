import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';

export const POST = withLogging(async ({ params, request, locals, redirect, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response('Server configuration error', { status: 500 });
  }

  if (!locals.user) return redirect('/admin/login');

  const { slug } = params;
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const payout_pct = formData.get('payout_pct') as string;

  if (!name || !email) {
    return redirect(
      `/admin/events/${slug}/collaborators?error=${encodeURIComponent('Name and email are required')}`,
    );
  }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', slug!)
    .single();

  if (!event) return redirect('/admin');

  const { error } = await supabaseAdmin.from('collaborators').insert({
    event_id: event.id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    payout_pct: parseFloat(payout_pct) || 0,
  });

  if (error) {
    log.error('collaborator.add_failed', { slug, error: error.message, code: error.code });
    return redirect(
      `/admin/events/${slug}/collaborators?error=${encodeURIComponent('Failed to add collaborator')}`,
    );
  }

  log.info('collaborator.added', { slug, email: email.split('@')[0] + '@***' });
  return redirect(
    `/admin/events/${slug}/collaborators?success=${encodeURIComponent('Collaborator added')}`,
  );
});
