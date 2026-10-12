import type { House, LatLng } from './types';

const EARTH_RADIUS_M = 6_371_000;

/** Auto check-off only when the kid is this close to a house. */
export const AUTO_VISIT_RADIUS_M = 25;
/** GPS readings worse than this are too noisy to auto check-off neighbouring houses. */
export const MAX_TRUSTED_ACCURACY_M = 40;

// Rough bounding box of Israel; must match the check in the add_house SQL function.
export const SERVICE_AREA = { minLat: 29.4, maxLat: 33.4, minLng: 34.2, maxLng: 35.95 };

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function nearestUnvisited(
  position: LatLng,
  houses: House[],
  visited: ReadonlySet<string>,
): { house: House; meters: number } | null {
  let best: { house: House; meters: number } | null = null;
  for (const house of houses) {
    if (visited.has(house.id)) continue;
    const meters = distanceMeters(position, house);
    if (!best || meters < best.meters) best = { house, meters };
  }
  return best;
}

/** Returns the id of the unvisited house the kid is standing at, or null. */
export function findAutoVisit(
  position: LatLng,
  accuracyM: number,
  houses: House[],
  visited: ReadonlySet<string>,
  radiusM = AUTO_VISIT_RADIUS_M,
): string | null {
  if (accuracyM > MAX_TRUSTED_ACCURACY_M) return null;
  const nearest = nearestUnvisited(position, houses, visited);
  return nearest && nearest.meters <= radiusM ? nearest.house.id : null;
}

export function isInServiceArea(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const a = SERVICE_AREA;
  return lat >= a.minLat && lat <= a.maxLat && lng >= a.minLng && lng <= a.maxLng;
}
