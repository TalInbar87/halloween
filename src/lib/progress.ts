// Everything here lives only on the kid's own device. Storage can be blocked
// (private mode, cleared site data), so every access is wrapped.

const VISITED_KEY = 'halloween.visited.v1';
const VIEW_KEY = 'halloween.view.v1';

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

export interface VisitState {
  visited: ReadonlySet<string>;
  /** Houses the kid unmarked by hand; automatic check-off must leave them alone. */
  dismissed: ReadonlySet<string>;
}

export function applyToggle(state: VisitState, id: string): VisitState {
  const dismissed = new Set(state.dismissed);
  if (state.visited.has(id)) dismissed.add(id);
  else dismissed.delete(id);
  return { visited: toggleVisited(state.visited, id), dismissed };
}

export function applyAutoVisit(state: VisitState, id: string): VisitState {
  if (state.visited.has(id) || state.dismissed.has(id)) return state;
  return { ...state, visited: new Set(state.visited).add(id) };
}

export type View = 'map' | 'table';

/** Kid's last choice between the map and the table. */
export function loadView(storage: Storage): View {
  return readJson(storage, VIEW_KEY) === 'table' ? 'table' : 'map';
}

export function saveView(storage: Storage, view: View): void {
  writeJson(storage, VIEW_KEY, view);
}
