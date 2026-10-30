import type { House, LatLng } from './types';

const EARTH_RADIUS_M = 6_371_000;

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

export function isInServiceArea(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const a = SERVICE_AREA;
  return lat >= a.minLat && lat <= a.maxLat && lng >= a.minLng && lng <= a.maxLng;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * The houses that make up the neighbourhood: those within `radiusM` of the median point,
 * so one pin dropped far away doesn't zoom the whole map out.
 */
export function neighbourhoodHouses(houses: House[], radiusM = 1500): House[] {
  if (houses.length === 0) return houses;
  const center = { lat: median(houses.map((h) => h.lat)), lng: median(houses.map((h) => h.lng)) };
  const near = houses.filter((h) => distanceMeters(center, h) <= radiusM);
  return near.length ? near : houses;
}

/** Is `position` within `meters` of any house? */
export function isNearHouses(position: LatLng, houses: LatLng[], meters = 500): boolean {
  return houses.some((h) => distanceMeters(position, h) <= meters);
}
