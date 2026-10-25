// The neighbourhood password, remembered on this phone after the server accepted it,
// so kids type it once. It only opens the map (a low-value shared code), and is
// dropped as soon as the server rejects it (e.g. the organisers changed it).

const ACCESS_KEY = 'halloween.access.v1';

export function loadAccess(storage: Storage): string | null {
  try {
    const value = JSON.parse(storage.getItem(ACCESS_KEY) ?? 'null');
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
}

export function saveAccess(storage: Storage, password: string): void {
  try {
    storage.setItem(ACCESS_KEY, JSON.stringify(password));
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
