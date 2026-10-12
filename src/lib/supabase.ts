import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const DEFAULT_URL = 'https://ianuulantdgsshslnzhl.supabase.co';
const DEFAULT_KEY = 'sb_publishable_BGjhOWbW4Vd47asbA-G2bg_JHixB4Xz';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey.length > 20
  );
};

// Singleton client instance connected to live Supabase project
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);
