import { distanceMeters } from './geo';
import type { House } from './types';

/** "street, city · דירה 4, קומה 2, קוד בניין 1234#" */
export function formatAddress(h: Pick<House, 'address' | 'apartment' | 'floor' | 'building_code'>): string {
  const parts = [
    h.apartment && `דירה ${h.apartment}`,
    h.floor && `קומה ${h.floor}`,
    h.building_code && `קוד בניין ${h.building_code}`,
  ].filter(Boolean);
  return parts.length ? `${h.address} · ${parts.join(', ')}` : h.address;
}

export interface HouseGroup {
  key: string;
  lat: number;
  lng: number;
  houses: House[];
}

const sameAddress = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * One tappable marker per building: apartments with the same address are grouped even if
 * their pins were dropped a bit apart, and so are pins practically on top of each other.
 */
export function groupByLocation(houses: House[], radiusM = 4): HouseGroup[] {
  const groups: HouseGroup[] = [];
  for (const h of houses) {
    const group = groups.find(
      (g) => sameAddress(g.houses[0].address, h.address) || distanceMeters(g, h) <= radiusM,
    );
    if (group) group.houses.push(h);
    else groups.push({ key: h.id, lat: h.lat, lng: h.lng, houses: [h] });
  }
  return groups;
}

// Strip Hebrew/ASCII quote marks so צה"ל, צה״ל and צהל all match.
const normalize = (s: string) => s.toLowerCase().replace(/["'״׳`]/g, '');

const MAX_RESULTS = 8;

export function searchHouses(houses: House[], query: string): House[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return houses
    .filter((h) => {
      const text = normalize(formatAddress(h));
      return words.every((w) => text.includes(w));
    })
    .slice(0, MAX_RESULTS);
}
