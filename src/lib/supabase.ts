import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Supabase environment variables are missing! Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel.');
}

// Create client (will return a broken client if keys are empty, but prevents immediate JS crash on load)
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
