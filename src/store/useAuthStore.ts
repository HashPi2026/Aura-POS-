import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database, UserRole, BusinessType } from '../types/database';

export type Business = Database['public']['Tables']['businesses']['Row'];
export type BusinessMember = Database['public']['Tables']['business_members']['Row'];

const CACHED_USER_KEY = 'aura_cached_auth_user';
const CACHED_BUSINESS_KEY = 'aura_cached_business';
const CACHED_ROLE_KEY = 'aura_cached_role';

let isAuthListenerRegistered = false;

interface AuthState {
  user: User | null;
  session: Session | null;
  currentBusiness: Business | null;
  userBusinesses: Business[];
  currentRole: UserRole | null;
  isLoading: boolean;
  authError: string | null;
  isConfigured: boolean;
  pendingEmailConfirmation: string | null;
  needsOnboarding: boolean;
  isStandaloneMode: boolean;

  // Actions
  initAuth: () => Promise<void>;
  enableStandaloneMode: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  createBusiness: (name: string, businessType: BusinessType, gstin?: string) => Promise<{ success: boolean; error?: string }>;
  selectBusiness: (businessId: string) => Promise<void>;
  clearError: () => void;
  clearPendingConfirmation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  currentBusiness: null,
  userBusinesses: [],
  currentRole: null,
  isLoading: true,
  authError: null,
  isConfigured: isSupabaseConfigured(),
  pendingEmailConfirmation: null,
  needsOnboarding: false,
  isStandaloneMode: typeof localStorage !== 'undefined' && localStorage.getItem('aura_standalone_mode') === 'true',

  enableStandaloneMode: () => {
    const standaloneBiz: Business = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Aura Cafe & Roastery',
      business_type: 'cafe',
      tax_identifier: '29AAAAA0000A1Z5',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(standaloneBiz));
      localStorage.setItem('aura_standalone_mode', 'true');
      localStorage.setItem(CACHED_ROLE_KEY, 'cashier');
    }
    set({
      isStandaloneMode: true,
      currentBusiness: standaloneBiz,
      userBusinesses: [standaloneBiz],
      currentRole: 'cashier',
      authError: null,
      needsOnboarding: false,
    });
  },

  initAuth: async () => {
    const configured = isSupabaseConfigured();
    set({ isConfigured: configured });

    const wasStandalone = typeof localStorage !== 'undefined' && localStorage.getItem('aura_standalone_mode') === 'true';
    if (wasStandalone) {
      const cachedBizStr = localStorage.getItem(CACHED_BUSINESS_KEY);
      if (cachedBizStr) {
        try {
          const biz = JSON.parse(cachedBizStr);
          set({
            isStandaloneMode: true,
            currentBusiness: biz,
            userBusinesses: [biz],
            currentRole: (localStorage.getItem(CACHED_ROLE_KEY) as UserRole) || 'cashier',
            isLoading: false,
          });
          return;
        } catch (_) {}
      }
    }

    if (!configured) {
      // If unconfigured, automatically enable standalone café mode so user is never blocked
      get().enableStandaloneMode();
      set({ isLoading: false });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user, session });
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(session.user));
        await get().selectBusiness(''); // Load business and role
      } else {
        // Check if offline with cached credentials
        const cachedUserStr = localStorage.getItem(CACHED_USER_KEY);
        const cachedBizStr = localStorage.getItem(CACHED_BUSINESS_KEY);
        const cachedRole = localStorage.getItem(CACHED_ROLE_KEY) as UserRole | null;

        if (cachedUserStr && (!navigator.onLine || !session)) {
          try {
            const cachedUser = JSON.parse(cachedUserStr);
            const cachedBiz = cachedBizStr ? JSON.parse(cachedBizStr) : null;
            set({
              user: cachedUser,
              currentBusiness: cachedBiz,
              currentRole: cachedRole || null,
              userBusinesses: cachedBiz ? [cachedBiz] : [],
            });
          } catch (_) {
            set({ user: null, session: null, currentBusiness: null, currentRole: null });
          }
        } else {
          set({ user: null, session: null, currentBusiness: null, currentRole: null });
        }
      }

      // Register onAuthStateChange only ONCE
      if (!isAuthListenerRegistered) {
        isAuthListenerRegistered = true;
        supabase.auth.onAuthStateChange((event, newSession) => {
          if (newSession?.user) {
            set({
              user: newSession.user,
              session: newSession,
              pendingEmailConfirmation: null,
            });
            localStorage.setItem(CACHED_USER_KEY, JSON.stringify(newSession.user));
            // Do not await inside onAuthStateChange; dispatch asynchronously
            setTimeout(() => {
              get().selectBusiness('');
            }, 0);
          } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem(CACHED_USER_KEY);
            localStorage.removeItem(CACHED_BUSINESS_KEY);
            localStorage.removeItem(CACHED_ROLE_KEY);
            set({
              user: null,
              session: null,
              currentBusiness: null,
              currentRole: null,
              userBusinesses: [],
              needsOnboarding: false,
            });
          }
        });
      }
    } catch (err: any) {
      console.warn('Supabase auth initialization error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email, password) => {
    if (!get().isConfigured) {
      return { success: false, error: 'Supabase credentials are not configured in .env' };
    }

    set({ isLoading: true, authError: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        pendingEmailConfirmation: null,
      });

      if (data.user) {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user));
      }

      await get().selectBusiness('');
      return { success: true };
    } catch (err: any) {
      set({ authError: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithEmail: async (email, password, fullName) => {
    if (!get().isConfigured) {
      return { success: false, error: 'Supabase credentials are not configured in .env' };
    }

    set({ isLoading: true, authError: null, pendingEmailConfirmation: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;

      // When Supabase requires email confirmation, data.session is null!
      if (!data.session) {
        set({
          user: null,
          session: null,
          pendingEmailConfirmation: email,
        });
        return { success: true, needsConfirmation: true };
      }

      // If immediate session was provided
      set({
        user: data.user,
        session: data.session,
        pendingEmailConfirmation: null,
      });

      if (data.user) {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user));
      }

      setTimeout(() => {
        get().selectBusiness('');
      }, 0);

      return { success: true };
    } catch (err: any) {
      set({ authError: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    if (get().isConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (_) {}
    }

    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(CACHED_BUSINESS_KEY);
    localStorage.removeItem(CACHED_ROLE_KEY);
    localStorage.removeItem('aura_standalone_mode');

    set({
      user: null,
      session: null,
      currentBusiness: null,
      userBusinesses: [],
      currentRole: null,
      needsOnboarding: false,
      pendingEmailConfirmation: null,
      isStandaloneMode: false,
    });
  },

  createBusiness: async (name, businessType, gstin) => {
    const { user, isConfigured } = get();
    if (!isConfigured) {
      return { success: false, error: 'Supabase credentials are not configured in .env' };
    }

    if (!user) {
      return { success: false, error: 'User must be authenticated to create a business' };
    }

    set({ isLoading: true, authError: null });
    try {
      const ownerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner';

      // Call new RPC WITHOUT passing user id (derived from auth.uid() inside database)
      const { data: rpcRes, error: rpcError } = await (supabase.rpc as any)('create_business_and_owner', {
        p_name: name,
        p_business_type: businessType,
        p_tax_identifier: gstin || null,
        p_owner_name: ownerName,
      });

      if (rpcError) throw rpcError;

      const createdBiz = (rpcRes as any)?.business || {
        id: (rpcRes as any)?.business_id,
        name,
        business_type: businessType,
        tax_identifier: gstin || null,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      };

      const userBizList = [...get().userBusinesses, createdBiz];
      set({
        currentBusiness: createdBiz,
        userBusinesses: userBizList,
        currentRole: 'owner',
        needsOnboarding: false,
      });

      localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(createdBiz));
      localStorage.setItem(CACHED_ROLE_KEY, 'owner');

      return { success: true };
    } catch (err: any) {
      set({ authError: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  selectBusiness: async (businessId) => {
    const { user, isConfigured } = get();
    if (!isConfigured || !user) {
      set({ currentBusiness: null, currentRole: null });
      return;
    }

    set({ isLoading: true, authError: null });
    try {
      const { data: members, error } = await supabase
        .from('business_members')
        .select(`
          role,
          business_id,
          businesses (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        set({ authError: error.message });
        throw error;
      }

      if (!members || members.length === 0) {
        // No membership: surface state and show onboarding, NEVER silently default to cashier
        set({
          currentBusiness: null,
          currentRole: null,
          userBusinesses: [],
          needsOnboarding: true,
        });
        return;
      }

      const bizList: Business[] = members
        .map((m: any) => m.businesses)
        .filter(Boolean);

      set({ userBusinesses: bizList, needsOnboarding: false });

      let selected = bizList[0] || null;
      let selectedRole: UserRole | null = null;

      if (businessId) {
        selected = bizList.find((b) => b.id === businessId) || selected;
      }

      if (selected) {
        const memberRecord = members.find((m: any) => m.business_id === selected.id);
        if (memberRecord) {
          selectedRole = memberRecord.role;
        }
      }

      set({ currentBusiness: selected, currentRole: selectedRole });

      if (selected) {
        localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(selected));
      }
      if (selectedRole) {
        localStorage.setItem(CACHED_ROLE_KEY, selectedRole);
      }
    } catch (err: any) {
      console.error('Error fetching businesses:', err.message);
      set({ authError: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ authError: null }),
  clearPendingConfirmation: () => set({ pendingEmailConfirmation: null }),
}));
