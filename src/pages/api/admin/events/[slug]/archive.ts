import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';

export const POST = withLogging(async ({ params, locals, redirect, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response('Server configuration error', { status: 500 });
  }

  if (!locals.user) {
    return redirect('/admin/login');
  }

  const { slug } = params;

  const { error } = await supabaseAdmin
    .from('events')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('slug', slug!);

  if (error) {
    log.error('event.archive_failed', { slug, error: error.message });
    return redirect(`/admin/events/${slug}?error=${encodeURIComponent('Failed to archive event')}`);
  }

  log.info('event.archived', { slug });
  return redirect('/admin');
});
