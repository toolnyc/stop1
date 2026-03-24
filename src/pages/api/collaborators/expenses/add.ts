import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadReceipt } from '@/lib/blob';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!supabaseAdmin) {
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
    // Find the invite token to redirect back
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
    receiptUrl = await uploadReceipt(receipt, collaborator.id);
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

  // Get invite token for redirect
  const { data: collab } = await supabaseAdmin
    .from('collaborators')
    .select('invite_token')
    .eq('id', collaborator.id)
    .single();
  const token = collab?.invite_token ?? '';

  if (error) {
    console.error('Expense add error:', error);
    return redirect(`/collaborate/${token}/expenses?error=${encodeURIComponent('Failed to add expense')}`);
  }

  return redirect(`/collaborate/${token}/expenses?success=${encodeURIComponent('Expense added')}`);
};
