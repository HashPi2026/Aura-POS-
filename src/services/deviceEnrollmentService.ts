import { getDb } from '../db/indexedDb';
import { supabase, isSupabaseConfigured, logCloud, logCloudError } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

const STORAGE_KEY_PREFIX = 'aura_enrolled_device_';
const DEVICE_IDENTIFIER_KEY = 'aura_pos_stable_terminal_identifier';

/**
 * Returns a stable local terminal identifier (e.g., 'term_a1b2c3d4').
 * This is the hardware/browser instance token passed to enroll_device for idempotent binding.
 */
export function getStableDeviceIdentifier(): string {
  if (typeof window === 'undefined') {
    return 'node_terminal_test';
  }

  let id = localStorage.getItem(DEVICE_IDENTIFIER_KEY);
  if (!id) {
    id = 'term_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 13) : Math.random().toString(36).substring(2, 12));
    localStorage.setItem(DEVICE_IDENTIFIER_KEY, id);
  }
  return id;
}

/**
 * Retrieves the enrolled device UUID for the specified business from IndexedDB (with localStorage mirror).
 * Returns null if this terminal has not been enrolled in Supabase for this business.
 */
export async function getEnrolledDeviceId(businessId: string): Promise<string | null> {
  if (!businessId) return null;

  try {
    const db = await getDb();
    const stored = await db.get('settings', `${STORAGE_KEY_PREFIX}${businessId}`);
    if (stored && typeof stored === 'string') {
      return stored;
    }
  } catch (err) {
    console.warn('Error reading enrolled device from IndexedDB:', err);
  }

  // Fallback to localStorage
  if (typeof localStorage !== 'undefined') {
    const fallback = localStorage.getItem(`${STORAGE_KEY_PREFIX}${businessId}`);
    if (fallback) return fallback;
  }

  return null;
}

/**
 * Persists the enrolled device UUID for a business in both IndexedDB and localStorage.
 */
export async function saveEnrolledDeviceId(businessId: string, deviceId: string): Promise<void> {
  if (!businessId || !deviceId) return;

  try {
    const db = await getDb();
    await db.put('settings', deviceId, `${STORAGE_KEY_PREFIX}${businessId}`);
  } catch (err) {
    console.warn('Error saving enrolled device to IndexedDB:', err);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${businessId}`, deviceId);
  }
}

/**
 * Enrolls this browser/counter terminal in Supabase for the specified business.
 * Calls the `enroll_device` RPC with SECURITY DEFINER and search_path = public.
 * Idempotent per (business_id, device_identifier).
 */
export async function enrollDevice(
  businessId: string,
  locationId?: string,
  deviceName: string = 'Counter Terminal 1'
): Promise<{ success: boolean; deviceId?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Cloud not configured. Terminal running in local-only mode.' };
  }

  const user = useAuthStore.getState().user;
  if (!user) {
    return { success: false, error: 'User must be signed in to enroll a device.' };
  }

  const terminalIdentifier = getStableDeviceIdentifier();

  logCloud(`Enrolling terminal '${deviceName}' (identifier: ${terminalIdentifier}) for business ${businessId}...`);

  try {
    const { data, error } = await supabase.rpc('enroll_device', {
      p_business_id: businessId,
      p_location_id: locationId || undefined,
      p_name: deviceName,
      p_device_identifier: terminalIdentifier,
    } as any);

    if (error) {
      logCloudError('Failed to enroll device via RPC:', error);
      return { success: false, error: error.message || 'RPC enroll_device failed' };
    }

    const enrolledId = data as unknown as string;
    if (!enrolledId) {
      return { success: false, error: 'Enrollment returned empty device ID' };
    }

    await saveEnrolledDeviceId(businessId, enrolledId);
    logCloud(`Successfully enrolled terminal with UUID: ${enrolledId}`);
    return { success: true, deviceId: enrolledId };
  } catch (err: any) {
    logCloudError('Unexpected error enrolling device:', err);
    return { success: false, error: err.message || 'Failed to enroll terminal' };
  }
}
