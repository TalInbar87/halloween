// Current time, with a dev-only override for previewing time-based screens:
//   http://localhost:5173/?now=2026-10-31T17:05   (Israel time when no offset is given)
// Production builds ignore it (import.meta.env.DEV is false and the branch is stripped).

const ISRAEL_OFFSET_ON_HALLOWEEN = '+02:00';

export function parseNowOverride(search: string, isDev: boolean): Date | null {
  if (!isDev) return null;
  const raw = new URLSearchParams(search).get('now');
  if (!raw) return null;
  const hasOffset = /([zZ]|[+-]\d\d:?\d\d)$/.test(raw);
  const date = new Date(hasOffset ? raw : `${raw}${ISRAEL_OFFSET_ON_HALLOWEEN}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const override =
  typeof location !== 'undefined' ? parseNowOverride(location.search, import.meta.env.DEV) : null;
const startedAt = Date.now();

/** Real time, or — in dev with ?now= — the override, still ticking forward. */
export function currentTime(): Date {
  return override ? new Date(override.getTime() + (Date.now() - startedAt)) : new Date();
}
