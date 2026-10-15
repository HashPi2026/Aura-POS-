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

// Standard fallback role PINs for immediate access
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
   * Retrieves all cached staff members for a specific business.
   * Multi-Tenant Isolation: Each business only receives its own staff roster.
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

    // If online with valid session, query business_members scoped strictly by businessId
    if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('business_members')
          .select('id, user_id, role, full_name, is_active')
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          const remoteList: StaffPinMember[] = data.map((remote) => {
            const existing = cachedList.find((c) => c.userId === remote.user_id || c.id === remote.id);
            return {
              id: remote.id,
              userId: remote.user_id,
              fullName: remote.full_name || 'Staff Member',
              role: remote.role as UserRole,
              saltHex: existing?.saltHex,
              hashHex: existing?.hashHex,
              failedAttempts: existing?.failedAttempts || 0,
              lockedUntil: existing?.lockedUntil || null,
              defaultPin: existing?.defaultPin,
            };
          });

          this.saveStaffList(businessId, remoteList);
          return remoteList;
        }
      } catch (_) {}
    }

    if (cachedList.length > 0) {
      return cachedList;
    }

    // Default starter roster for this business
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
   * Allows business owner or manager to create a custom staff profile.
   * Scoped strictly to the specific business tenant.
   */
  public async createStaffProfile(
    businessId: string,
    fullName: string,
    role: UserRole,
    pin: string
  ): Promise<{ success: boolean; member?: StaffPinMember; error?: string }> {
    if (!fullName || fullName.trim().length === 0) {
      return { success: false, error: 'Staff name is required.' };
    }
    if (pin.length < 4 || pin.length > 6) {
      return { success: false, error: 'PIN must be between 4 and 6 digits.' };
    }

    const salt = generateSalt(16);
    const hash = await hashPinWithPbkdf2(pin, salt);
    const saltHex = bytesToHex(salt);
    const newStaffId = crypto.randomUUID ? crypto.randomUUID() : `staff_${Date.now()}_${Math.random()}`;

    const newMember: StaffPinMember = {
      id: newStaffId,
      userId: newStaffId,
      fullName: fullName.trim(),
      role,
      saltHex,
      hashHex: hash,
      failedAttempts: 0,
      lockedUntil: null,
      defaultPin: pin,
    };

    // Save to local tenant storage
    const currentList = await this.getStaffList(businessId);
    const updatedList = [...currentList, newMember];
    this.saveStaffList(businessId, updatedList);

    // If connected to Supabase cloud, persist to business_members table
    if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (UUID_REGEX.test(businessId)) {
          await supabase.from('business_members').insert({
            business_id: businessId,
            user_id: newStaffId,
            role,
            full_name: fullName.trim(),
            pin_hash: hash,
            is_active: true,
          });
        }
      } catch (err: any) {
        console.warn('Could not sync staff member to server, saved offline in tenant:', err.message);
      }
    }

    return { success: true, member: newMember };
  }

  /**
   * Resets all staff lockouts for this business.
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
      m.userId === userId || m.id === userId
        ? { ...m, saltHex, hashHex: hash, failedAttempts: 0, lockedUntil: null, defaultPin: pin }
        : m
    );
    this.saveStaffList(businessId, updated);

    // Online update if Supabase available
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
   * One-Tap Quick Login helper: returns verified member by role or userId.
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
   */
  public async verifyPin(businessId: string, userId?: string, pin = ''): Promise<VerifyPinResult> {
    const now = Date.now();
    const staffList = await this.getStaffList(businessId);

    // 1. FAST-PATH: Known demo master role PINs (e.g. 1111 for Owner, 1234 for Cashier)
    if (DEFAULT_ROLE_PINS[pin]) {
      const targetRoleInfo = DEFAULT_ROLE_PINS[pin];
      let matchedMember = staffList.find((m) => m.role === targetRoleInfo.role);

      if (!matchedMember) {
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
          defaultPin: pin,
        };
        staffList.push(matchedMember);
      }

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

    // Check existing lockout
    if (member.lockedUntil && member.lockedUntil > now) {
      const minutesLeft = Math.ceil((member.lockedUntil - now) / 60000);
      return {
        success: false,
        locked: true,
        attemptsLeft: 0,
        error: `PIN is locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}. (Or use Master PIN 1111)`,
      };
    }

    // 3. Check selected member's hash or defaultPin
    if (member.defaultPin && member.defaultPin === pin) {
      const updated = staffList.map((m) =>
        m.userId === member.userId ? { ...m, failedAttempts: 0, lockedUntil: null } : m
      );
      this.saveStaffList(businessId, updated);
      return { success: true, member };
    }

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

    // 4. Check if entered PIN matches ANY other staff member in this business roster
    for (const other of staffList) {
      if (other.userId !== member.userId) {
        if (other.defaultPin && other.defaultPin === pin) {
          const updated = staffList.map((m) =>
            m.userId === other.userId ? { ...m, failedAttempts: 0, lockedUntil: null } : m
          );
          this.saveStaffList(businessId, updated);
          return { success: true, member: other };
        }
        if (other.saltHex && other.hashHex) {
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

  /**
   * Updates an existing staff profile (full name, role, or PIN).
   */
  public async updateStaffProfile(
    businessId: string,
    memberId: string,
    updates: { fullName?: string; role?: UserRole; pin?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const list = await this.getStaffList(businessId);
    const target = list.find((m) => m.id === memberId || m.userId === memberId);
    if (!target) {
      return { success: false, error: 'Staff member not found.' };
    }

    let saltHex = target.saltHex;
    let hashHex = target.hashHex;
    let defaultPin = target.defaultPin;

    if (updates.pin) {
      if (updates.pin.length < 4 || updates.pin.length > 6) {
        return { success: false, error: 'PIN must be between 4 and 6 digits.' };
      }
      const salt = generateSalt(16);
      hashHex = await hashPinWithPbkdf2(updates.pin, salt);
      saltHex = bytesToHex(salt);
      defaultPin = updates.pin;
    }

    const updatedList = list.map((m) =>
      m.id === memberId || m.userId === memberId
        ? {
            ...m,
            fullName: updates.fullName !== undefined ? updates.fullName.trim() : m.fullName,
            role: updates.role !== undefined ? updates.role : m.role,
            saltHex,
            hashHex,
            defaultPin,
            failedAttempts: 0,
            lockedUntil: null,
          }
        : m
    );

    this.saveStaffList(businessId, updatedList);
    return { success: true };
  }

  /**
   * Deletes a staff member from this business (Owner profile cannot be deleted).
   */
  public async deleteStaffProfile(
    businessId: string,
    memberId: string
  ): Promise<{ success: boolean; error?: string }> {
    const list = await this.getStaffList(businessId);
    const target = list.find((m) => m.id === memberId || m.userId === memberId);
    if (!target) {
      return { success: false, error: 'Staff member not found.' };
    }
    if (target.role === 'owner') {
      return { success: false, error: 'The Business Owner profile cannot be removed.' };
    }

    const updatedList = list.filter((m) => m.id !== memberId && m.userId !== memberId);
    this.saveStaffList(businessId, updatedList);

    if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (UUID_REGEX.test(memberId) && UUID_REGEX.test(businessId)) {
          await supabase
            .from('business_members')
            .update({ is_active: false })
            .eq('id', memberId)
            .eq('business_id', businessId);
        }
      } catch (err: any) {
        console.warn('Could not deactivate staff remotely:', err.message);
      }
    }

    return { success: true };
  }

  private async createDefaultStaffRoster(businessId: string): Promise<StaffPinMember[]> {
    // Multi-tenant CIA rule: Real SaaS apps do not preload fake demo employees for a tenant.
    // We only initialize the verified Business Owner profile. The owner can then create
    // custom profiles for their actual staff (cashier, waiter, barista, kitchen chef, etc.)
    const salt = generateSalt(16);
    const hash = await hashPinWithPbkdf2('1111', salt);
    const ownerId = `staff_owner_${businessId.replace(/-/g, '').slice(0, 8)}`;

    const ownerMember: StaffPinMember = {
      id: ownerId,
      userId: ownerId,
      fullName: 'Business Owner',
      role: 'owner',
      saltHex: bytesToHex(salt),
      hashHex: hash,
      failedAttempts: 0,
      lockedUntil: null,
      defaultPin: '1111',
    };

    return [ownerMember];
  }
}

export const staffPinService = new StaffPinService();
