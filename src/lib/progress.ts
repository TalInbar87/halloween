// Everything here lives only on the kid's own device. Storage can be blocked
// (private mode, cleared site data), so every access is wrapped.

const VISITED_KEY = 'halloween.visited.v1';
const VIEW_KEY = 'halloween.view.v1';
const THEME_KEY = 'halloween.mapTheme.v1';

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

export type View = 'map' | 'table';

/** Kid's last choice between the map and the table. */
export function loadView(storage: Storage): View {
  return readJson(storage, VIEW_KEY) === 'table' ? 'table' : 'map';
}

export function saveView(storage: Storage, view: View): void {
  writeJson(storage, VIEW_KEY, view);
}

export type MapTheme = 'dark' | 'light';

/** Dark Halloween map by default; the kid can switch to the regular light map. */
export function loadMapTheme(storage: Storage): MapTheme {
  return readJson(storage, THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function saveMapTheme(storage: Storage, theme: MapTheme): void {
  writeJson(storage, THEME_KEY, theme);
}
