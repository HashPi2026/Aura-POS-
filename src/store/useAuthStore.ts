import { create } from 'zustand';
import { UserRole, BusinessType } from '../types/database';
import { restApi } from '../api/restClient';

export interface Business {
  id: string;
  name: string;
  business_type?: BusinessType;
  businessType?: BusinessType;
  tax_identifier?: string | null;
  taxIdentifier?: string | null;
  currency?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
  address?: string;
  phone?: string;
  owner_name?: string;
  ownerName?: string;
  owner_phone?: string;
  ownerPhone?: string;
  owner_email?: string;
  ownerEmail?: string;
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
  address: 'Sharthi Residency, Kumbhariya Gam, Surat, 395010',
  phone: '+91 80 2520 8900',
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
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  createBusiness: (
    name: string,
    businessType: BusinessType,
    gstin?: string,
    address?: string,
    ownerName?: string,
    ownerPhone?: string,
    ownerEmail?: string,
    password?: string
  ) => Promise<{ success: boolean; error?: string }>;
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
        const rawBiz = res.business || cachedBiz || DEFAULT_BUSINESS;
        const business: Business = {
          ...rawBiz,
          business_type: rawBiz.business_type || rawBiz.businessType || 'cafe',
          businessType: rawBiz.businessType || rawBiz.business_type || 'cafe',
        };
        const user: AuthUser = res.user || cachedUser || DEFAULT_USER;
        const role = (res.role || user.role || 'owner') as UserRole;

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

    // 3. Restore cached session if valid login was previously stored
    if (cachedUser && cachedBiz) {
      const finalBiz: Business = {
        ...cachedBiz,
        business_type: cachedBiz.business_type || cachedBiz.businessType || 'cafe',
        businessType: cachedBiz.businessType || cachedBiz.business_type || 'cafe',
      };
      const finalRole = cachedRole || cachedUser.role || 'owner';

      set({
        user: cachedUser,
        currentBusiness: finalBiz,
        userBusinesses: [finalBiz],
        currentRole: finalRole,
        isLoading: false,
        isConfigured: true,
        authError: null,
      });
      return;
    }

    // 4. Fresh SaaS startup: user is unauthenticated and must start on Login/Register page
    set({
      user: null,
      currentBusiness: null,
      userBusinesses: [],
      currentRole: null,
      isLoading: false,
      isConfigured: true,
      authError: null,
      isStandaloneMode: false,
    });
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true, authError: null });
    try {
      const res = await restApi.auth.login({ email, password });
      if (res.success) {
        const user: AuthUser = res.user;
        const rawBiz = res.business || DEFAULT_BUSINESS;
        const business: Business = {
          ...rawBiz,
          business_type: rawBiz.business_type || rawBiz.businessType || 'cafe',
          businessType: rawBiz.businessType || rawBiz.business_type || 'cafe',
        };
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

        // Immediately switch POS store to this business's isolated data
        try {
          const { usePosStore } = await import('./usePosStore');
          await usePosStore.getState().switchBusiness(business.id, business, user);
        } catch (_) {}

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

    try {
      const { usePosStore } = await import('./usePosStore');
      usePosStore.setState({ isLocked: true });
    } catch (_) {}

    set({
      user: null,
      currentBusiness: null,
      userBusinesses: [],
      currentRole: null,
      needsOnboarding: false,
      isStandaloneMode: false,
    });
  },

  createBusiness: async (name, businessType, gstin, address, ownerName, ownerPhone, ownerEmail, password) => {
    set({ isLoading: true, authError: null });
    try {
      const res = await restApi.business.create({
        name,
        businessType,
        taxIdentifier: gstin,
        address,
        phone: ownerPhone,
        ownerName,
        ownerPhone,
        ownerEmail,
        password,
      });

      if (!res.success && res.error) {
        throw new Error(res.error);
      }

      const biz: Business = res.business;
      const ownerUser: AuthUser = res.user || {
        id: `user_${Date.now()}`,
        email: ownerEmail || '',
        fullName: ownerName || 'Owner',
        role: 'owner',
      };

      if (typeof localStorage !== 'undefined') {
        if (res.token) localStorage.setItem(CACHED_TOKEN_KEY, res.token);
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(ownerUser));
        localStorage.setItem(CACHED_BUSINESS_KEY, JSON.stringify(biz));
        localStorage.setItem(CACHED_ROLE_KEY, 'owner');
      }

      set({
        user: ownerUser,
        currentBusiness: biz,
        userBusinesses: [biz],
        currentRole: 'owner',
        needsOnboarding: false,
        authError: null,
      });

      // Synchronize active POS store profile and switch to isolated business state
      try {
        const { usePosStore } = await import('./usePosStore');
        await usePosStore.getState().switchBusiness(biz.id, biz, ownerUser);
      } catch (_) {}

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
      try {
        const { usePosStore } = await import('./usePosStore');
        await usePosStore.getState().switchBusiness(biz.id, biz, get().user);
      } catch (_) {}
    }
  },

  clearError: () => set({ authError: null }),
  clearPendingConfirmation: () => set({ pendingEmailConfirmation: null }),
}));
