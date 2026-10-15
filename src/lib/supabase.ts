import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * Standard log helper with [aura-cloud] prefix for all Supabase operations.
 */
export const logCloud = (message: string, ...args: any[]): void => {
  console.log(`[aura-cloud] ${message}`, ...args);
};

export const logCloudError = (message: string, error?: any): void => {
  console.error(`[aura-cloud] ${message}`, error || '');
};

/**
 * Returns true strictly if both URL and publishable/anon key are present and non-empty.
 * Absolutely no hardcoded fallback values.
 */
export const isSupabaseConfigured = (): boolean => {
  if (!rawUrl || !rawKey) {
    return false;
  }
  // Basic validation that it's a URL and has a plausible key length
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.protocol.startsWith('http')) return false;
  } catch (_) {
    return false;
  }
  return rawKey.length > 20 && !rawUrl.includes('placeholder') && !rawUrl.includes('your-project');
};

/**
 * Extracts and returns the project hostname (e.g. "abc.supabase.co") without any secrets.
 */
export const getSupabaseHostname = (): string => {
  if (!rawUrl) return 'Not configured';
  try {
    return new URL(rawUrl).hostname;
  } catch (_) {
    return 'Invalid URL';
  }
};

/**
 * Creates a no-op safe proxy for Supabase client when environment variables are missing.
 * Prevents runtime null-pointer crashes while logging clear [aura-cloud] diagnostics.
 */
function createUnconfiguredProxy(): SupabaseClient<Database> {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'auth') {
        return {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithPassword: async () => {
            logCloudError('Authentication attempted while cloud is not configured.');
            return { data: { user: null, session: null }, error: { message: 'Cloud not configured. Running in local mode.', code: 'CLOUD_NOT_CONFIGURED' } };
          },
          signUp: async () => {
            logCloudError('Sign-up attempted while cloud is not configured.');
            return { data: { user: null, session: null }, error: { message: 'Cloud not configured. Running in local mode.', code: 'CLOUD_NOT_CONFIGURED' } };
          },
          signOut: async () => ({ error: null }),
        };
      }

      if (prop === 'channel') {
        return () => ({
          on: function() { return this; },
          subscribe: (callback?: (status: string) => void) => {
            if (callback) callback('CLOSED');
            return this;
          },
          send: async () => ({}),
        });
      }

      if (prop === 'removeChannel') {
        return () => {};
      }

      if (prop === 'rpc' || prop === 'from') {
        return () => {
          logCloudError(`Database query (${String(prop)}) attempted while cloud is not configured.`);
          const queryBuilder: any = {
            select: () => queryBuilder,
            insert: () => queryBuilder,
            update: () => queryBuilder,
            delete: () => queryBuilder,
            eq: () => queryBuilder,
            neq: () => queryBuilder,
            order: () => queryBuilder,
            limit: () => queryBuilder,
            single: async () => ({ data: null, error: { message: 'Cloud not configured. Running in local-only mode.', code: 'CLOUD_NOT_CONFIGURED' } }),
            then: (resolve: any) => resolve({ data: null, error: { message: 'Cloud not configured. Running in local-only mode.', code: 'CLOUD_NOT_CONFIGURED' } }),
          };
          return queryBuilder;
        };
      }

      return () => ({ data: null, error: { message: 'Cloud not configured', code: 'CLOUD_NOT_CONFIGURED' } });
    },
  };

  return new Proxy({}, handler) as unknown as SupabaseClient<Database>;
}

// Export the real client when configured, or the safe proxy when missing.
// Absolutely NO hardcoded URLs or keys.
export const supabase: SupabaseClient<Database> = isSupabaseConfigured()
  ? createClient<Database>(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : createUnconfiguredProxy();
