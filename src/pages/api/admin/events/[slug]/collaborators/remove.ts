import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  if (!supabaseAdmin) {
    return new Response('Server configuration error', { status: 500 });
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) return redirect('/admin/login');

  const { slug } = params;
  const formData = await request.formData();
  const collaboratorId = formData.get('collaborator_id') as string;

  if (!collaboratorId) {
    return redirect(`/admin/events/${slug}/collaborators?error=${encodeURIComponent('Missing collaborator ID')}`);
  }

  // Check for existing expenses
  const { count } = await supabaseAdmin
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('collaborator_id', collaboratorId);

  if (count && count > 0) {
    return redirect(`/admin/events/${slug}/collaborators?error=${encodeURIComponent('Cannot remove collaborator with existing expenses')}`);
  }

  const { error } = await supabaseAdmin
    .from('collaborators')
    .delete()
    .eq('id', collaboratorId);

  if (error) {
    console.error('Failed to remove collaborator:', error);
    return redirect(`/admin/events/${slug}/collaborators?error=${encodeURIComponent('Failed to remove collaborator')}`);
  }

  return redirect(`/admin/events/${slug}/collaborators?success=${encodeURIComponent('Collaborator removed')}`);
};
