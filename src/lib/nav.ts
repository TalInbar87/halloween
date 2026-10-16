import { distanceMeters } from './geo';
import type { House, LatLng } from './types';

/** Close enough to say "you've arrived" (we still never mark the house by ourselves). */
export const ARRIVED_M = 20;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Compass bearing from `a` to `b`: 0 = north, 90 = east. */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} מ׳` : `${(meters / 1000).toFixed(1)} ק״מ`;
}

/** Nearest house that still has candy and wasn't visited (optionally skipping the current target). */
export function pickNextHouse(
  position: LatLng,
  houses: House[],
  visited: ReadonlySet<string>,
  skipId?: string,
): House | null {
  let best: { house: House; meters: number } | null = null;
  for (const h of houses) {
    if (visited.has(h.id) || h.out_of_candy || h.id === skipId) continue;
    const meters = distanceMeters(position, h);
    if (!best || meters < best.meters) best = { house: h, meters };
  }
  return best?.house ?? null;
}

/** The round is finished when every house was visited or has no candy left. */
export function isAllDone(houses: House[], visited: ReadonlySet<string>): boolean {
  return (
    houses.some((h) => visited.has(h.id)) && houses.every((h) => visited.has(h.id) || h.out_of_candy)
  );
}
