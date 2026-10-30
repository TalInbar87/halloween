import { describe, it, expect } from 'vitest';
import { distanceMeters, isInServiceArea, isNearHouses, nearestUnvisited, neighbourhoodHouses } from './geo';
import type { House } from './types';

const house = (id: string, lat: number, lng: number): House => ({
  id,
  address: `addr ${id}`,
  street: null,
  house_number: null,
  apartment: null,
  floor: null,
  building_code: null,
  out_of_candy: false,
  lat,
  lng,
  notes: null,
  created_at: '2026-10-12T00:00:00Z',
});

describe('distanceMeters', () => {
  it('returns 0 for the same point', () => {
    expect(distanceMeters({ lat: 32.08, lng: 34.78 }, { lat: 32.08, lng: 34.78 })).toBe(0);
  });

  it('measures ~111m for 0.001 degrees of latitude', () => {
    const d = distanceMeters({ lat: 32.0, lng: 34.8 }, { lat: 32.001, lng: 34.8 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it('is symmetric', () => {
    const a = { lat: 32.1, lng: 34.8 };
    const b = { lat: 32.11, lng: 34.81 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });
});

describe('nearestUnvisited', () => {
  const houses = [house('a', 32.0, 34.8), house('b', 32.002, 34.8), house('c', 32.01, 34.8)];

  it('returns the nearest unvisited house with its distance', () => {
    const result = nearestUnvisited({ lat: 32.0021, lng: 34.8 }, houses, new Set(['b']));
    expect(result?.house.id).toBe('a');
    expect(result?.meters).toBeGreaterThan(200);
  });

  it('returns null when every house is visited', () => {
    expect(nearestUnvisited({ lat: 32, lng: 34.8 }, houses, new Set(['a', 'b', 'c']))).toBeNull();
  });
});

describe('isInServiceArea', () => {
  it('accepts a point in Israel', () => {
    expect(isInServiceArea(32.08, 34.78)).toBe(true);
  });

  it('rejects a point outside Israel', () => {
    expect(isInServiceArea(48.85, 2.35)).toBe(false);
  });

  it('rejects non-finite values', () => {
    expect(isInServiceArea(Number.NaN, 34.8)).toBe(false);
  });
});

describe('neighbourhoodHouses', () => {
  it('drops a house pinned far from the rest', () => {
    const list = [house('a', 32.05, 34.858), house('b', 32.051, 34.859), house('c', 32.049, 34.857), house('far', 32.1, 34.8)];
    expect(neighbourhoodHouses(list).map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles empty and spread-out lists', () => {
    expect(neighbourhoodHouses([])).toEqual([]);
    const spread = [house('a', 32.0, 34.8), house('b', 32.2, 35.0)];
    expect(neighbourhoodHouses(spread)).toEqual(spread);
  });
});

describe('isNearHouses', () => {
  it('is true within 500 m of a house and false far away', () => {
    const list = [house('a', 32.05, 34.858)];
    expect(isNearHouses({ lat: 32.052, lng: 34.858 }, list)).toBe(true);
    expect(isNearHouses({ lat: 32.08, lng: 34.82 }, list)).toBe(false);
  });
});
