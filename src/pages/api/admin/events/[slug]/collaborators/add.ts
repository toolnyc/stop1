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
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const payout_pct = formData.get('payout_pct') as string;

  if (!name || !email) {
    return redirect(`/admin/events/${slug}/collaborators?error=${encodeURIComponent('Name and email are required')}`);
  }

  // Look up event
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', slug!)
    .single();

  if (!event) return redirect('/admin');

  const { error } = await supabaseAdmin
    .from('collaborators')
    .insert({
      event_id: event.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      payout_pct: parseFloat(payout_pct) || 0,
    });

  if (error) {
    console.error('Failed to add collaborator:', error);
    return redirect(`/admin/events/${slug}/collaborators?error=${encodeURIComponent('Failed to add collaborator')}`);
  }

  return redirect(`/admin/events/${slug}/collaborators?success=${encodeURIComponent('Collaborator added')}`);
};
