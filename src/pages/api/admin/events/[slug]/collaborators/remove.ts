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
  const collaboratorId = formData.get('collaborator_id') as string;

  if (!collaboratorId) {
    return redirect(
      `/admin/events/${slug}/collaborators?error=${encodeURIComponent('Missing collaborator ID')}`,
    );
  }

  const { count } = await supabaseAdmin
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('collaborator_id', collaboratorId);

  if (count && count > 0) {
    return redirect(
      `/admin/events/${slug}/collaborators?error=${encodeURIComponent('Cannot remove collaborator with existing expenses')}`,
    );
  }

  const { error } = await supabaseAdmin.from('collaborators').delete().eq('id', collaboratorId);

  if (error) {
    log.error('collaborator.remove_failed', { slug, collaboratorId, error: error.message });
    return redirect(
      `/admin/events/${slug}/collaborators?error=${encodeURIComponent('Failed to remove collaborator')}`,
    );
  }

  log.info('collaborator.removed', { slug, collaboratorId });
  return redirect(
    `/admin/events/${slug}/collaborators?success=${encodeURIComponent('Collaborator removed')}`,
  );
});
