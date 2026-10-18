import { create } from 'zustand';
import { UserRole, BusinessType } from '../types/database';
import { restApi } from '../api/restClient';

export interface Business {
  id: string;
  name: string;
  business_type?: BusinessType;
  tax_identifier?: string | null;
  currency?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
  address?: string;
  phone?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

const CACHED_USER_KEY = 'aura_cached_auth_user';
const CACHED_BUSINESS_KEY = 'aura_cached_business';
const CACHED_ROLE_KEY = 'aura_cached_role';
const CACHED_TOKEN_KEY = 'aura_auth_token';

const DEFAULT_BUSINESS: Business = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Spice Cafe',
  business_type: 'cafe',
  tax_identifier: '29AABCS1234F1Z8',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  address: '100ft Road, Indiranagar, Bengaluru, Karnataka',
  phone: '+91 80 4123 5678',
};

const DEFAULT_USER: AuthUser = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'spicecafe@gmail.com',
  fullName: 'Rahul Patel',
  role: 'owner',
};

interface AuthState {
  user: AuthUser | null;
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
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  createBusiness: (name: string, businessType: BusinessType, gstin?: string) => Promise<{ success: boolean; error?: string }>;
  selectBusiness: (businessId: string) => Promise<void>;
  setUserFromPin: (member: { id: string; userId: string; fullName: string; role: UserRole }) => void;
  clearError: () => void;
  clearPendingConfirmation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  currentBusiness: null,
  userBusinesses: [],
  currentRole: null,
  isLoading: true,
  authError: null,
  isConfigured: true,
  pendingEmailConfirmation: null,
  needsOnboarding: false,
  isStandaloneMode: false,

  enableStandaloneMode: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(DEFAULT_BUSINESS));
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(DEFAULT_USER));
      localStorage.setItem(CACHED_ROLE_KEY, 'cashier');
      localStorage.setItem('aura_standalone_mode', 'true');
    }
    set({
      isStandaloneMode: true,
      user: DEFAULT_USER,
      currentBusiness: DEFAULT_BUSINESS,
      userBusinesses: [DEFAULT_BUSINESS],
      currentRole: 'cashier',
      authError: null,
      needsOnboarding: false,
      isLoading: false,
    });
  },

  setUserFromPin: (member) => {
    const authUser: AuthUser = {
      id: member.userId || member.id,
      email: `${member.role}@auracafe.com`,
      fullName: member.fullName,
      role: member.role,
    };
    const biz = get().currentBusiness || DEFAULT_BUSINESS;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(authUser));
      localStorage.setItem(CACHED_ROLE_KEY, member.role);
      localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(biz));
    }

    set({
      user: authUser,
      currentBusiness: biz,
      currentRole: member.role,
      userBusinesses: [biz],
      authError: null,
    });
  },

  initAuth: async () => {
    set({ isLoading: true });

    // 1. Try to read from localStorage first for instant offline startup
    let cachedUser: AuthUser | null = null;
    let cachedBiz: Business | null = null;
    let cachedRole: UserRole | null = null;

    if (typeof localStorage !== 'undefined') {
      try {
        const u = localStorage.getItem(CACHED_USER_KEY);
        const b = localStorage.getItem(CACHED_BUSINESS_KEY);
        const r = localStorage.getItem(CACHED_ROLE_KEY);
        if (u) cachedUser = JSON.parse(u);
        if (b) cachedBiz = JSON.parse(b);
        if (r) cachedRole = r as UserRole;
      } catch (_) {}
    }

    // 2. Query REST API /api/auth/me to check active session with backend
    try {
      const res = await restApi.auth.me();
      if (res && res.authenticated) {
        const user: AuthUser = res.user || cachedUser || DEFAULT_USER;
        const business: Business = res.business || cachedBiz || DEFAULT_BUSINESS;
        const role = (res.role || user.role || 'cashier') as UserRole;

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
          localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(business));
          localStorage.setItem(CACHED_ROLE_KEY, role);
        }

        set({
          user,
          currentBusiness: business,
          userBusinesses: [business],
          currentRole: role,
          isLoading: false,
          isConfigured: true,
          authError: null,
        });
        return;
      }
    } catch (err: any) {
      console.info('Backend auth ping completed:', err.message);
    }

    // 3. Fallback to cached or default Aura session so terminal is NEVER locked out
    const finalUser = cachedUser || DEFAULT_USER;
    const finalBiz = cachedBiz || DEFAULT_BUSINESS;
    const finalRole = cachedRole || finalUser.role || 'cashier';

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(finalUser));
      localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(finalBiz));
      localStorage.setItem(CACHED_ROLE_KEY, finalRole);
    }

    set({
      user: finalUser,
      currentBusiness: finalBiz,
      userBusinesses: [finalBiz],
      currentRole: finalRole,
      isLoading: false,
      isConfigured: true,
      authError: null,
    });
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true, authError: null });
    try {
      const res = await restApi.auth.login({ email, password });
      if (res.success) {
        const user: AuthUser = res.user;
        const business: Business = res.business || DEFAULT_BUSINESS;
        const role: UserRole = res.role || user.role || 'owner';

        if (typeof localStorage !== 'undefined') {
          if (res.token) localStorage.setItem(CACHED_TOKEN_KEY, res.token);
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
          localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(business));
          localStorage.setItem(CACHED_ROLE_KEY, role);
        }

        set({
          user,
          currentBusiness: business,
          userBusinesses: [business],
          currentRole: role,
          needsOnboarding: false,
          authError: null,
        });
        return { success: true };
      }
      throw new Error(res.error || 'Login failed');
    } catch (err: any) {
      set({ authError: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithEmail: async (email, password, fullName) => {
    set({ isLoading: true, authError: null });
    try {
      const res = await restApi.auth.register({
        email,
        fullName,
        businessName: 'Aura Cafe & Roastery',
      });
      if (res.success) {
        const user: AuthUser = res.user;
        const business: Business = res.business || DEFAULT_BUSINESS;
        const role: UserRole = res.role || 'owner';

        if (typeof localStorage !== 'undefined') {
          if (res.token) localStorage.setItem(CACHED_TOKEN_KEY, res.token);
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
          localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(business));
          localStorage.setItem(CACHED_ROLE_KEY, role);
        }

        set({
          user,
          currentBusiness: business,
          userBusinesses: [business],
          currentRole: role,
          needsOnboarding: false,
          authError: null,
        });
        return { success: true };
      }
      throw new Error(res.error || 'Registration failed');
    } catch (err: any) {
      set({ authError: err.message });
      return { success: false, error: err.message };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await restApi.auth.logout();
    } catch (_) {}

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CACHED_TOKEN_KEY);
      localStorage.removeItem(CACHED_USER_KEY);
      localStorage.removeItem(CACHED_BUSINESS_KEY);
      localStorage.removeItem(CACHED_ROLE_KEY);
      localStorage.removeItem('aura_standalone_mode');
    }

    set({
      user: null,
      currentBusiness: null,
      userBusinesses: [],
      currentRole: null,
      needsOnboarding: false,
      isStandaloneMode: false,
    });
  },

  createBusiness: async (name, businessType, gstin) => {
    set({ isLoading: true, authError: null });
    try {
      const res = await restApi.business.update({
        name,
        businessType,
        taxIdentifier: gstin,
      });

      const biz: Business = res.business || {
        id: '00000000-0000-0000-0000-000000000001',
        name,
        business_type: businessType,
        tax_identifier: gstin,
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(biz));
      }

      set({
        currentBusiness: biz,
        userBusinesses: [biz],
        currentRole: 'owner',
        needsOnboarding: false,
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
    const biz = get().userBusinesses.find((b) => b.id === businessId) || get().currentBusiness;
    if (biz) {
      set({ currentBusiness: biz });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(biz));
      }
    }
  },

  clearError: () => set({ authError: null }),
  clearPendingConfirmation: () => set({ pendingEmailConfirmation: null }),
}));
