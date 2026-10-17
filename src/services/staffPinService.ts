import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types/database';

export interface StaffPinMember {
  id: string;
  userId: string;
  fullName: string;
  role: UserRole;
  saltHex?: string;
  hashHex?: string;
  failedAttempts: number;
  lockedUntil: number | null;
  defaultPin?: string;
}

export interface VerifyPinResult {
  success: boolean;
  member?: StaffPinMember;
  locked?: boolean;
  attemptsLeft?: number;
  error?: string;
}

const STORAGE_PREFIX = 'aura_staff_pins_';

// Standard demo role PINs for instantaneous, foolproof access
export const DEFAULT_ROLE_PINS: Record<string, { role: UserRole; name: string; id: string }> = {
  '1111': { role: 'owner', name: 'Cafe Owner', id: 'staff_owner_01' },
  '1234': { role: 'cashier', name: 'Barista Ramesh', id: 'staff_cashier_01' },
  '2222': { role: 'waiter', name: 'Priya Sharma', id: 'staff_waiter_01' },
  '3333': { role: 'kitchen', name: 'Chef Anand', id: 'staff_kitchen_01' },
  '4444': { role: 'accountant', name: 'Vikram Accountant', id: 'staff_accountant_01' },
};

// Helper: Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Derives a cryptographic salted PBKDF2 hash using Web Crypto API.
 */
export async function hashPinWithPbkdf2(pin: string, salt: Uint8Array): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Basic fallback for non-browser test runner
    return `fallback_${pin}_${bytesToHex(salt)}`;
  }

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

/**
 * Generates a random cryptographic salt.
 */
export function generateSalt(length = 16): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const salt = new Uint8Array(length);
    crypto.getRandomValues(salt);
    return salt;
  }
  return new Uint8Array(Array.from({ length }, () => Math.floor(Math.random() * 256)));
}

class StaffPinService {
  /**
   * Retrieves all cached staff members for a business.
   * If empty, populates default café staff roster for immediate offline & demo usage.
   */
  public async getStaffList(businessId: string): Promise<StaffPinMember[]> {
    const key = `${STORAGE_PREFIX}${businessId}`;
    let cachedList: StaffPinMember[] = [];

    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          cachedList = JSON.parse(stored);
        } catch (_) {}
      }
    }

    // If online with valid session, attempt to refresh staff names from business_members
    if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('business_members')
          .select('id, user_id, role, full_name, is_active')
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          const remoteList: StaffPinMember[] = data.map((remote) => {
            const existing = cachedList.find((c) => c.userId === remote.user_id);
            return {
              id: remote.id,
              userId: remote.user_id,
              fullName: remote.full_name || 'Staff Member',
              role: remote.role as UserRole,
              saltHex: existing?.saltHex,
              hashHex: existing?.hashHex,
              failedAttempts: existing?.failedAttempts || 0,
              lockedUntil: existing?.lockedUntil || null,
            };
          });

          // Ensure standard cafe staff roles exist for instant terminal testing
          const defaultRoster = await this.createDefaultStaffRoster(businessId);
          for (const def of defaultRoster) {
            if (!remoteList.some((r) => r.role === def.role)) {
              remoteList.push(def);
            }
          }

          this.saveStaffList(businessId, remoteList);
          return remoteList;
        }
      } catch (_) {}
    }

    if (cachedList.length > 0) {
      return cachedList;
    }

    // Initialize default staff team if none exist
    const defaultRoster = await this.createDefaultStaffRoster(businessId);
    this.saveStaffList(businessId, defaultRoster);
    return defaultRoster;
  }

  public saveStaffList(businessId: string, list: StaffPinMember[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREFIX}${businessId}`, JSON.stringify(list));
    }
  }

  /**
   * Resets all staff lockouts and restores default demo credentials immediately.
   */
  public async resetAllPinsAndLockout(businessId: string): Promise<StaffPinMember[]> {
    const defaultRoster = await this.createDefaultStaffRoster(businessId);
    this.saveStaffList(businessId, defaultRoster);
    return defaultRoster;
  }

  /**
   * Sets or updates a staff member's PIN both online and offline.
   */
  public async setStaffPin(businessId: string, userId: string, pin: string): Promise<{ success: boolean; error?: string }> {
    if (pin.length < 4 || pin.length > 6) {
      return { success: false, error: 'PIN must be 4 to 6 digits' };
    }

    const salt = generateSalt(16);
    const hash = await hashPinWithPbkdf2(pin, salt);
    const saltHex = bytesToHex(salt);

    const staffList = await this.getStaffList(businessId);
    const updated = staffList.map((m) =>
      m.userId === userId
        ? { ...m, saltHex, hashHex: hash, failedAttempts: 0, lockedUntil: null }
        : m
    );
    this.saveStaffList(businessId, updated);

    // Online update if Supabase available and user is authenticated
    if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (UUID_REGEX.test(userId) && UUID_REGEX.test(businessId)) {
          await (supabase.rpc as any)('set_staff_pin', {
            p_business_id: businessId,
            p_user_id: userId,
            p_pin: pin,
          });
        }
      } catch (err: any) {
        console.warn('Could not sync PIN to server, cached offline:', err.message);
      }
    }

    return { success: true };
  }

  /**
   * One-Tap Quick Login helper: immediately returns verified member by role or userId.
   */
  public async quickLogin(businessId: string, roleOrUserId: string): Promise<VerifyPinResult> {
    const staffList = await this.getStaffList(businessId);
    const member =
      staffList.find((m) => m.role === roleOrUserId || m.userId === roleOrUserId || m.id === roleOrUserId) ||
      staffList[0];

    if (!member) {
      return { success: false, error: 'Staff member not found' };
    }

    // Reset attempts and lockout
    const updated = staffList.map((m) =>
      m.userId === member.userId ? { ...m, failedAttempts: 0, lockedUntil: null } : m
    );
    this.saveStaffList(businessId, updated);

    return {
      success: true,
      member: {
        ...member,
        failedAttempts: 0,
        lockedUntil: null,
      },
    };
  }

  /**
   * Verifies a staff PIN with universal role-detection and 5-attempt lockout.
   * - Typing '1111' ALWAYS unlocks Cafe Owner.
   * - Typing '1234' ALWAYS unlocks Cashier.
   * - Typing '2222' ALWAYS unlocks Waiter.
   * - Typing '3333' ALWAYS unlocks Kitchen.
   * - Typing '4444' ALWAYS unlocks Accountant.
   * - Also checks selected staff hash & all other cached staff hashes.
   */
  public async verifyPin(businessId: string, userId?: string, pin = ''): Promise<VerifyPinResult> {
    const now = Date.now();
    const staffList = await this.getStaffList(businessId);

    // 1. FAST-PATH: Known demo master role PINs (e.g. 1111 for Owner, 1234 for Cashier)
    if (DEFAULT_ROLE_PINS[pin]) {
      const targetRoleInfo = DEFAULT_ROLE_PINS[pin];
      let matchedMember = staffList.find((m) => m.role === targetRoleInfo.role);

      if (!matchedMember) {
        // Create the member if missing from roster
        const salt = generateSalt(16);
        const hash = await hashPinWithPbkdf2(pin, salt);
        matchedMember = {
          id: targetRoleInfo.id,
          userId: targetRoleInfo.id,
          fullName: targetRoleInfo.name,
          role: targetRoleInfo.role,
          saltHex: bytesToHex(salt),
          hashHex: hash,
          failedAttempts: 0,
          lockedUntil: null,
        };
        staffList.push(matchedMember);
      }

      // Always clear lockout and reset failed attempts on correct default PIN!
      const updated = staffList.map((m) =>
        m.role === targetRoleInfo.role
          ? { ...m, failedAttempts: 0, lockedUntil: null }
          : m
      );
      this.saveStaffList(businessId, updated);

      return {
        success: true,
        member: {
          ...matchedMember,
          failedAttempts: 0,
          lockedUntil: null,
        },
      };
    }

    // 2. Resolve Target Staff Member
    const member = userId
      ? staffList.find((m) => m.userId === userId || m.id === userId) || staffList[0]
      : staffList[0];

    if (!member) {
      return { success: false, error: 'Staff member not found' };
    }

    // Check existing lockout on target member
    if (member.lockedUntil && member.lockedUntil > now) {
      const minutesLeft = Math.ceil((member.lockedUntil - now) / 60000);
      return {
        success: false,
        locked: true,
        attemptsLeft: 0,
        error: `PIN is locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}. (Or use Master PIN 1111)`,
      };
    }

    // 3. Check selected member's hash
    if (member.saltHex && member.hashHex) {
      const salt = hexToBytes(member.saltHex);
      const computedHash = await hashPinWithPbkdf2(pin, salt);

      if (computedHash === member.hashHex) {
        const updated = staffList.map((m) =>
          m.userId === member.userId ? { ...m, failedAttempts: 0, lockedUntil: null } : m
        );
        this.saveStaffList(businessId, updated);
        return { success: true, member };
      }
    } else {
      // First-time PIN setup for this member
      await this.setStaffPin(businessId, member.userId, pin);
      return { success: true, member };
    }

    // 4. Check if entered PIN matches ANY other staff member in the roster
    for (const other of staffList) {
      if (other.userId !== member.userId && other.saltHex && other.hashHex) {
        const salt = hexToBytes(other.saltHex);
        const computed = await hashPinWithPbkdf2(pin, salt);
        if (computed === other.hashHex) {
          const updated = staffList.map((m) =>
            m.userId === other.userId ? { ...m, failedAttempts: 0, lockedUntil: null } : m
          );
          this.saveStaffList(businessId, updated);
          return { success: true, member: other };
        }
      }
    }

    // 5. Failed attempt handling
    const newFailures = (member.failedAttempts || 0) + 1;
    const isLocked = newFailures >= 5;
    const lockedUntil = isLocked ? now + 15 * 60 * 1000 : null;
    const attemptsLeft = Math.max(0, 5 - newFailures);

    const updated = staffList.map((m) =>
      m.userId === member.userId
        ? { ...m, failedAttempts: newFailures, lockedUntil }
        : m
    );
    this.saveStaffList(businessId, updated);

    return {
      success: false,
      locked: isLocked,
      attemptsLeft,
      error: isLocked
        ? 'PIN is temporarily locked due to 5 failed attempts. Please wait 15 minutes, or use Owner PIN 1111 to unlock.'
        : `Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining. (Owner: 1111, Cashier: 1234)`,
    };
  }

  private async createDefaultStaffRoster(businessId: string): Promise<StaffPinMember[]> {
    const roles: { name: string; role: UserRole; pin: string; id: string }[] = [
      { name: 'Cafe Owner', role: 'owner', pin: '1111', id: 'staff_owner_01' },
      { name: 'Barista Ramesh', role: 'cashier', pin: '1234', id: 'staff_cashier_01' },
      { name: 'Priya Sharma', role: 'waiter', pin: '2222', id: 'staff_waiter_01' },
      { name: 'Chef Anand', role: 'kitchen', pin: '3333', id: 'staff_kitchen_01' },
      { name: 'Vikram Accountant', role: 'accountant', pin: '4444', id: 'staff_accountant_01' },
    ];

    const roster: StaffPinMember[] = [];
    for (const r of roles) {
      const salt = generateSalt(16);
      const hash = await hashPinWithPbkdf2(r.pin, salt);
      roster.push({
        id: r.id,
        userId: r.id,
        fullName: r.name,
        role: r.role,
        saltHex: bytesToHex(salt),
        hashHex: hash,
        failedAttempts: 0,
        lockedUntil: null,
        defaultPin: r.pin,
      });
    }

    return roster;
  }
}

export const staffPinService = new StaffPinService();
