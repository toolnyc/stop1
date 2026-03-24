import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!supabaseAdmin) {
    return new Response('Server configuration error', { status: 500 });
  }

  const collaborator = locals.collaborator;
  if (!collaborator) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await request.formData();
  const expenseId = formData.get('expense_id') as string;

  // Get invite token for redirect
  const { data: collab } = await supabaseAdmin
    .from('collaborators')
    .select('invite_token')
    .eq('id', collaborator.id)
    .single();
  const token = collab?.invite_token ?? '';

  if (!expenseId) {
    return redirect(`/collaborate/${token}/expenses?error=${encodeURIComponent('Missing expense ID')}`);
  }

  // Check if any payouts exist for this event
  const { count } = await supabaseAdmin
    .from('payouts')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', collaborator.eventId);

  if (count && count > 0) {
    return redirect(`/collaborate/${token}/expenses?error=${encodeURIComponent('Cannot delete expenses after payouts have been recorded')}`);
  }

  // Only delete own expenses
  const { error } = await supabaseAdmin
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('collaborator_id', collaborator.id);

  if (error) {
    console.error('Expense delete error:', error);
    return redirect(`/collaborate/${token}/expenses?error=${encodeURIComponent('Failed to delete expense')}`);
  }

  return redirect(`/collaborate/${token}/expenses?success=${encodeURIComponent('Expense deleted')}`);
};
