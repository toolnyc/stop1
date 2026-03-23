import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@/lib/supabase';

export const POST: APIRoute = async ({ params, cookies, redirect }) => {
  if (!supabaseAdmin) {
    return new Response('Server configuration error', { status: 500 });
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return redirect('/admin/login');
  }

  const { slug } = params;

  const { error } = await supabaseAdmin
    .from('events')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('slug', slug!);

  if (error) {
    console.error('Failed to archive event:', error);
    return redirect(`/admin/events/${slug}?error=${encodeURIComponent('Failed to archive event')}`);
  }

  return redirect('/admin');
};
