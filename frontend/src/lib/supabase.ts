import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || 'https://hwdxpvmypxnpfiamcmvs.supabase.co').trim();
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZHhwdm15cHhucGZpYW1jbXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzE5NDcsImV4cCI6MjEwNzcwNzk0N30.FkTI2Y3cST2Oh2BHlNVpjiX66U2qIDNU1RVUPIeSjcE').trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('unconfigured') &&
    supabaseAnonKey.length > 20
  );
};

// Safe fallback client when env vars are missing so the React app boots into local offline mode without throwing
const dummyUrl = 'https://unconfigured.supabase.co';
const dummyAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.unconfigured_client_key';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  isSupabaseConfigured() ? supabaseUrl : dummyUrl,
  isSupabaseConfigured() ? supabaseAnonKey : dummyAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);
