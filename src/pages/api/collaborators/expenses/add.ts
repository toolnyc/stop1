import { supabaseAdmin } from '@/lib/supabase';
import { uploadReceipt } from '@/lib/blob';
import { withLogging } from '@/lib/api';
import { trackCall } from '@/lib/track';

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
  const description = formData.get('description') as string;
  const amount = formData.get('amount') as string;
  const receipt = formData.get('receipt') as File | null;

  if (!description || !amount) {
    const { data: collab } = await supabaseAdmin
      .from('collaborators')
      .select('invite_token')
      .eq('id', collaborator.id)
      .single();
    const token = collab?.invite_token ?? '';
    return redirect(`/collaborate/${token}/expenses?error=${encodeURIComponent('Description and amount are required')}`);
  }

  let receiptUrl: string | null = null;
  if (receipt && receipt.size > 0) {
    if (receipt.size > 10 * 1024 * 1024) {
      const { data: collab } = await supabaseAdmin
        .from('collaborators')
        .select('invite_token')
        .eq('id', collaborator.id)
        .single();
      return redirect(`/collaborate/${collab?.invite_token}/expenses?error=${encodeURIComponent('Receipt must be under 10MB')}`);
    }

    const uploadResult = await trackCall({
      service: 'blob',
      action: 'upload-receipt',
      meta: { collaboratorId: collaborator.id, size: receipt.size },
      log,
      fn: () => uploadReceipt(receipt, collaborator.id),
    });

    if (uploadResult.ok) {
      receiptUrl = uploadResult.data;
    } else {
      log.error('expense.receipt_upload_failed', { error: uploadResult.error });
    }
  }

  const { error } = await supabaseAdmin
    .from('expenses')
    .insert({
      event_id: collaborator.eventId,
      collaborator_id: collaborator.id,
      description: description.trim(),
      amount: parseFloat(amount),
      receipt_url: receiptUrl,
    });

  const { data: collab } = await supabaseAdmin
    .from('collaborators')
    .select('invite_token')
    .eq('id', collaborator.id)
    .single();
  const token = collab?.invite_token ?? '';

  if (error) {
    log.error('expense.add_failed', { collaboratorId: collaborator.id, error: error.message });
    return redirect(`/collaborate/${token}/expenses?error=${encodeURIComponent('Failed to add expense')}`);
  }

  log.info('expense.added', { collaboratorId: collaborator.id, amount });
  return redirect(`/collaborate/${token}/expenses?success=${encodeURIComponent('Expense added')}`);
});
