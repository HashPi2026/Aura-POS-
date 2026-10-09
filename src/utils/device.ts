/**
 * Automatically retrieves or generates a stable terminal device identifier.
 * Persisted in browser localStorage so cashiers and users never have to configure it manually.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'terminal_server';
  }

  const STORAGE_KEY = 'aura_pos_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    deviceId = `counter_pos_${randomSuffix}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}
