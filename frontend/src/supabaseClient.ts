import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

console.log('[Supabase] Env Check:', {
  url: supabaseUrl ? 'OK' : 'MISSING',
  key: supabaseAnonKey ? 'OK' : 'MISSING'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Critical: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is undefined!');
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
console.log('[Supabase] Client instance created.');
