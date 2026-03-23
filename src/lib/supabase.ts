import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error('Missing PUBLIC_SUPABASE_URL environment variable');
}

// Public client - uses anon key, respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey || '');

// Admin client - uses service role key, bypasses RLS
// Only use server-side!
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
