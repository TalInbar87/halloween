// Everything here lives only on the kid's own device. Storage can be blocked
// (private mode, cleared site data), so every access is wrapped.

const VISITED_KEY = 'halloween.visited.v1';
const OWNED_KEY = 'halloween.owned.v1';

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // progress just won't persist across reloads
  }
}

export function loadVisited(storage: Storage): Set<string> {
  const data = readJson(storage, VISITED_KEY);
  return new Set(Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string') : []);
}

export function saveVisited(storage: Storage, visited: ReadonlySet<string>): void {
  writeJson(storage, VISITED_KEY, [...visited]);
}

export function toggleVisited(visited: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(visited);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Houses added from this device, mapped to the secret token that lets us remove them. */
export function loadOwnedHouses(storage: Storage): Record<string, string> {
  const data = readJson(storage, OWNED_KEY);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'),
  );
}

export function saveOwnedHouse(storage: Storage, id: string, token: string): void {
  writeJson(storage, OWNED_KEY, { ...loadOwnedHouses(storage), [id]: token });
}

export function forgetOwnedHouse(storage: Storage, id: string): void {
  const owned = loadOwnedHouses(storage);
  delete owned[id];
  writeJson(storage, OWNED_KEY, owned);
}
