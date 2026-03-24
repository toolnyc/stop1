import { supabaseAdmin } from '@/lib/supabase';
import { withLogging } from '@/lib/api';

export const POST = withLogging(async ({ request, locals, redirect, log }) => {
  if (!supabaseAdmin) {
    log.error('supabase_admin_missing');
    return new Response('Server configuration error', { status: 500 });
  }

  const collaborator = locals.collaborator;
  if (!collaborator) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await request.formData();
  const expenseId = formData.get('expense_id') as string;

  const { data: collab } = await supabaseAdmin
    .from('collaborators')
    .select('invite_token')
    .eq('id', collaborator.id)
    .single();
  const token = collab?.invite_token ?? '';

  if (!expenseId) {
    return redirect(`/collaborate/${token}/expenses?error=${encodeURIComponent('Missing expense ID')}`);
  }

  const { count } = await supabaseAdmin
    .from('payouts')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', collaborator.eventId);

  if (count && count > 0) {
    return redirect(`/collaborate/${token}/expenses?error=${encodeURIComponent('Cannot delete expenses after payouts have been recorded')}`);
  }

  const { error } = await supabaseAdmin
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('collaborator_id', collaborator.id);

  if (error) {
    log.error('expense.delete_failed', { collaboratorId: collaborator.id, expenseId, error: error.message });
    return redirect(`/collaborate/${token}/expenses?error=${encodeURIComponent('Failed to delete expense')}`);
  }

  log.info('expense.deleted', { collaboratorId: collaborator.id, expenseId });
  return redirect(`/collaborate/${token}/expenses?success=${encodeURIComponent('Expense deleted')}`);
});
