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

// Everything is in one city, so people write it (or not) in many ways.
const CITY = /(קר(י)?ית[\s-]*אונו|kiryat[\s-]*ono)/gi;

/**
 * "street number" only, so the same building matches however it was typed:
 * "נהר הירדן 27", "נהר הירדן 27 קרית אונו", "רחוב נהר הירדן 27, קריית אונו" → "נהר הירדן 27".
 */
export function addressKey(address: string): string {
  return address
    .split(',')[0]
    .replace(CITY, ' ')
    .replace(/["'״׳`]/g, '')
    .replace(/^\s*(רחוב|רח)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Old free text "נהר הירדן 27 קרית אונו" → { street: "נהר הירדן", houseNumber: "27" }. */
export function splitAddress(address: string): { street: string; houseNumber: string } {
  const clean = address
    .split(',')[0]
    .replace(CITY, ' ')
    .replace(/^\s*(רחוב|רח'?)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const m = clean.match(/^(.*?)\s*(\d+\s*[א-ת]?)$/);
  return m ? { street: m[1].trim(), houseNumber: m[2].replace(/\s+/g, '') } : { street: clean, houseNumber: '' };
}

const groupKey = (h: House) =>
  h.street && h.house_number ? addressKey(`${h.street} ${h.house_number}`) : addressKey(h.address);

/**
 * One tappable marker per building: apartments with the same address are grouped even if
 * their pins were dropped a bit apart, and so are pins practically on top of each other.
 */
export function groupByLocation(houses: House[], radiusM = 4): HouseGroup[] {
  const groups: HouseGroup[] = [];
  for (const h of houses) {
    const group = groups.find(
      (g) => groupKey(g.houses[0]) === groupKey(h) || distanceMeters(g, h) <= radiusM,
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
