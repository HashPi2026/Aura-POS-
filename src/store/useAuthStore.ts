import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database, UserRole, BusinessType } from '../types/database';

export type Business = Database['public']['Tables']['businesses']['Row'];
export type BusinessMember = Database['public']['Tables']['business_members']['Row'];

interface AuthState {
  user: User | null;
  session: Session | null;
  currentBusiness: Business | null;
  userBusinesses: Business[];
  currentRole: UserRole | null;
  isLoading: boolean;
  authError: string | null;
  isConfigured: boolean;

  // Actions
  initAuth: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  createBusiness: (name: string, businessType: BusinessType, gstin?: string) => Promise<{ success: boolean; error?: string }>;
  selectBusiness: (businessId: string) => Promise<void>;
  clearError: () => void;
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

  initAuth: async () => {
    const configured = isSupabaseConfigured();
    set({ isConfigured: configured });

    if (!configured) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user, session });
        await get().selectBusiness(''); // Load default business
      } else {
        set({ user: null, session: null, currentBusiness: null, currentRole: null });
      }

      // Listen to auth state changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession?.user) {
          set({ user: newSession.user, session: newSession });
          await get().selectBusiness('');
        } else {
          set({ user: null, session: null, currentBusiness: null, currentRole: null });
        }
      });
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
      set({ user: data.user, session: data.session });
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

    set({ isLoading: true, authError: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      set({ user: data.user, session: data.session });
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
      await supabase.auth.signOut();
    }
    set({
      user: null,
      session: null,
      currentBusiness: null,
      userBusinesses: [],
      currentRole: null,
    });
  },

  createBusiness: async (name, businessType, gstin) => {
    let { user, isConfigured } = get();
    if (!isConfigured) {
      return { success: false, error: 'Supabase credentials are not configured' };
    }

    set({ isLoading: true, authError: null });
    try {
      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          user = userData.user;
          set({ user });
        }
      }

      if (!user) {
        const errorMsg = 'Please sign in or sign up first to attach ownership of this business.';
        set({ authError: errorMsg });
        return { success: false, error: errorMsg };
      }

      const ownerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner';

      // Atomic RPC create_business_and_owner
      const { data: rpcRes, error: rpcError } = await (supabase.rpc as any)('create_business_and_owner', {
        p_name: name,
        p_business_type: businessType,
        p_tax_identifier: gstin || null,
        p_user_id: user.id,
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
      });

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
    if (!isConfigured || !user) return;

    try {
      // Fetch businesses this user is member of
      const { data: members, error } = await supabase
        .from('business_members')
        .select(`
          role,
          business_id,
          businesses (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error || !members) return;

      const bizList: Business[] = members
        .map((m: any) => m.businesses)
        .filter(Boolean);

      set({ userBusinesses: bizList });

      let selected = bizList[0] || null;
      let role: UserRole = 'cashier';

      if (businessId) {
        selected = bizList.find((b) => b.id === businessId) || selected;
      }

      if (selected) {
        const memberRecord = members.find((m: any) => m.business_id === selected.id);
        if (memberRecord) {
          role = memberRecord.role;
        }
      }

      set({ currentBusiness: selected, currentRole: role });
    } catch (err: any) {
      console.warn('Error fetching businesses:', err.message);
    }
  },

  clearError: () => set({ authError: null }),
}));
