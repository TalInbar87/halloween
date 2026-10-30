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

const collator = new Intl.Collator('he', { numeric: true });

/** Floor or apartment: "2" before "10", blank last. */
const compareUnit = (a: string | null, b: string | null) => (!a ? (b ? 1 : 0) : !b ? -1 : collator.compare(a, b));

const compareFloorApartment = (a: House, b: House) =>
  compareUnit(a.floor, b.floor) || compareUnit(a.apartment, b.apartment);

/** Street, then house number (9 before 10), then floor and apartment. */
export function sortByAddress(houses: House[]): House[] {
  return [...houses].sort((a, b) => collator.compare(a.address, b.address) || compareFloorApartment(a, b));
}

/** Floor, then apartment, then address — the order you walk up a building. */
export function sortByFloor(houses: House[]): House[] {
  return [...houses].sort((a, b) => compareFloorApartment(a, b) || collator.compare(a.address, b.address));
}

export function searchHouses(houses: House[], query: string, limit = MAX_RESULTS): House[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return houses
    .filter((h) => {
      const text = normalize(formatAddress(h));
      return words.every((w) => text.includes(w));
    })
    .slice(0, limit);
}

/** The round is finished when every house was visited or has no candy left. */
export function isAllDone(houses: House[], visited: ReadonlySet<string>): boolean {
  return houses.some((h) => visited.has(h.id)) && houses.every((h) => visited.has(h.id) || h.out_of_candy);
}

/**
 * Marking `id` finished a building with several apartments (every other apartment
 * there is visited or out of candy)? Returns the building's address, else null.
 */
export function completedBuilding(houses: House[], visited: ReadonlySet<string>, id: string): string | null {
  const group = groupByLocation(houses).find((g) => g.houses.some((h) => h.id === id));
  if (!group || group.houses.length < 2) return null;
  const othersDone = group.houses.every((h) => h.id === id || visited.has(h.id) || h.out_of_candy);
  return othersDone ? group.houses[0].address : null;
}
