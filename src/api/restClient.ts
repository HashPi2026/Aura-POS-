/**
 * Aura POS REST API Client
 * Provides typed HTTP communication between Frontend and Backend
 */

const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
}

async function fetchJson<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('aura_auth_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err: any) {
    console.warn(`[REST API] Request to ${endpoint} failed:`, err.message);
    throw err;
  }
}

export const restApi = {
  // Health
  health: {
    check: () => fetchJson('/health'),
  },

  // Auth
  auth: {
    me: () => fetchJson('/auth/me'),
    login: (credentials: { email?: string; password?: string; pin?: string; role?: string }) =>
      fetchJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    verifyPin: (pin: string, userId?: string, role?: string) =>
      fetchJson('/auth/pin-verify', {
        method: 'POST',
        body: JSON.stringify({ pin, userId, role }),
      }),
    register: (data: { email: string; fullName: string; businessName: string }) =>
      fetchJson('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () =>
      fetchJson('/auth/logout', {
        method: 'POST',
      }),
  },

  // Products / Menu
  products: {
    getAll: () => fetchJson<{ success: boolean; categories: string[]; products: any[] }>('/products'),
    save: (product: any) =>
      fetchJson('/products', {
        method: 'POST',
        body: JSON.stringify(product),
      }),
    delete: (id: string) =>
      fetchJson(`/products/${id}`, {
        method: 'DELETE',
      }),
  },

  // Sales & Offline-First Cloud Sync
  sales: {
    getAll: (businessId?: string) =>
      fetchJson<{ success: boolean; count: number; sales: any[] }>(
        `/sales${businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''}`
      ),
    create: (sale: any) =>
      fetchJson('/sales', {
        method: 'POST',
        body: JSON.stringify(sale),
      }),
    sync: (saleOrSales: any) =>
      fetchJson<{ success: boolean; synced: number; duplicates: number; message: string; sales: any[]; error?: string }>(
        '/sales/sync',
        {
          method: 'POST',
          body: JSON.stringify(Array.isArray(saleOrSales) ? { sales: saleOrSales } : { sale: saleOrSales }),
        }
      ),
    getStats: (businessId?: string) =>
      fetchJson(`/sales/stats${businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''}`),
  },

  // Tables
  tables: {
    getAll: () => fetchJson<{ success: boolean; tables: any[] }>('/tables'),
    update: (id: string, table: any) =>
      fetchJson(`/tables/${id}`, {
        method: 'PUT',
        body: JSON.stringify(table),
      }),
    reset: () =>
      fetchJson('/tables/reset', {
        method: 'POST',
      }),
  },

  // Kitchen Order Tickets (KOT)
  kot: {
    getAll: (businessId?: string) =>
      fetchJson<{ success: boolean; kots: any[] }>(
        `/kot${businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''}`
      ),
    create: (kot: any) =>
      fetchJson('/kot', {
        method: 'POST',
        body: JSON.stringify(kot),
      }),
    updateStatus: (id: string, status: 'PREPARING' | 'READY' | 'SERVED') =>
      fetchJson(`/kot/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) =>
      fetchJson(`/kot/${id}`, {
        method: 'DELETE',
      }),
  },

  // Business Profile
  business: {
    get: (businessId?: string) =>
      fetchJson<{ success: boolean; business: any }>(
        `/business${businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''}`
      ),
    create: (data: any) =>
      fetchJson('/business', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (data: any) =>
      fetchJson('/business', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getStaff: (businessId?: string) =>
      fetchJson<{ success: boolean; staff: any[] }>(
        `/business/staff${businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''}`
      ),
  },

  // Supabase Cloud Bridge
  supabase: {
    getStatus: () =>
      fetchJson<{ configured: boolean; url: string; hasKey: boolean; maskedKey?: string; targetProject: string }>(
        '/supabase/status'
      ),
    config: (data: { url?: string; anonKey?: string }) =>
      fetchJson<{ success: boolean; configured: boolean; url: string }>('/supabase/config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    pushAll: (data?: { url?: string; anonKey?: string }) =>
      fetchJson<{ success: boolean; pushedCount?: number; error?: string; message?: string }>('/supabase/push-all', {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
  },
};
