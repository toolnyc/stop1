import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  if (!supabaseAdmin) {
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

  const { slug } = params;
  const contentType = request.headers.get('content-type') || '';
  let collaboratorId: string, amount: string, method: string, notes: string, paid_at: string;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    collaboratorId = body.collaboratorId;
    amount = body.amount;
    method = body.method;
    notes = body.notes || '';
    paid_at = body.paid_at || new Date().toISOString();
  } else {
    const formData = await request.formData();
    collaboratorId = formData.get('collaborator_id') as string;
    amount = formData.get('amount') as string;
    method = formData.get('method') as string;
    notes = (formData.get('notes') as string) || '';
    paid_at = (formData.get('paid_at') as string) || new Date().toISOString();
  }

  if (!collaboratorId || !amount || !method) {
    if (contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'collaboratorId, amount, and method are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect(`/admin/events/${slug}/budget?error=${encodeURIComponent('Missing required fields')}`);
  }

  // Look up event
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', slug!)
    .single();

  if (!event) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('payouts')
    .insert({
      event_id: event.id,
      collaborator_id: collaboratorId,
      amount: parseFloat(amount),
      method: method as 'cash' | 'venmo' | 'zelle' | 'bank_transfer' | 'other',
      notes: notes || null,
      paid_at,
    })
    .select()
    .single();

  if (error) {
    console.error('Payout record error:', error);
    if (contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Failed to record payout' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect(`/admin/events/${slug}/budget?error=${encodeURIComponent('Failed to record payout')}`);
  }

  if (contentType.includes('application/json')) {
    return new Response(JSON.stringify({ success: true, payout: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect(`/admin/events/${slug}/budget`);
};
