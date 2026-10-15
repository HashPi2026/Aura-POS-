const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Automatically retrieves or generates a stable terminal device UUID.
 * Persisted in browser localStorage so cashiers and users never have to configure it manually.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-0000-0000-000000000001';
  }

  const STORAGE_KEY = 'aura_pos_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId || !UUID_REGEX.test(deviceId)) {
    deviceId = generateUuid();
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}
