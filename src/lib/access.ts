// The neighbourhood password, remembered on this phone for 5 hours after the server
// accepted it, so kids type it once per evening. It only opens the map (a low-value
// shared code), and is dropped early if the server rejects it (e.g. it was changed).

const ACCESS_KEY = 'halloween.access.v1';
export const ACCESS_TTL_MS = 5 * 60 * 60 * 1000;

interface StoredAccess {
  password: string;
  expires: number;
}

export function loadAccess(storage: Storage, now: number = Date.now()): string | null {
  try {
    const value = JSON.parse(storage.getItem(ACCESS_KEY) ?? 'null') as Partial<StoredAccess> | null;
    const valid =
      value && typeof value === 'object' && typeof value.password === 'string' && value.password !== '' &&
      typeof value.expires === 'number' && value.expires > now;
    if (valid) return value.password!;
    // Expired, or saved by the older version without an expiry: forget it.
    if (value !== null) clearAccess(storage);
    return null;
  } catch {
    return null;
  }
}

export function saveAccess(storage: Storage, password: string, now: number = Date.now()): void {
  try {
    const stored: StoredAccess = { password, expires: now + ACCESS_TTL_MS };
    storage.setItem(ACCESS_KEY, JSON.stringify(stored));
  } catch {
    // not remembered: they'll be asked again next visit
  }
}

export function clearAccess(storage: Storage): void {
  try {
    storage.removeItem(ACCESS_KEY);
  } catch {
    // nothing to do
  }
}
