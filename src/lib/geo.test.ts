import { describe, it, expect } from 'vitest';
import { distanceMeters, findAutoVisit, isInServiceArea, nearestUnvisited } from './geo';
import type { House } from './types';

const house = (id: string, lat: number, lng: number): House => ({
  id,
  address: `addr ${id}`,
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

describe('findAutoVisit', () => {
  const houses = [house('a', 32.0, 34.8), house('b', 32.001, 34.8)];

  it('returns the closest unvisited house within the radius', () => {
    const pos = { lat: 32.00005, lng: 34.8 }; // ~5.5m from a
    expect(findAutoVisit(pos, 10, houses, new Set())).toBe('a');
  });

  it('ignores houses already visited', () => {
    const pos = { lat: 32.00005, lng: 34.8 };
    expect(findAutoVisit(pos, 10, houses, new Set(['a']))).toBeNull();
  });

  it('returns null when nothing is within the radius', () => {
    const pos = { lat: 32.0005, lng: 34.8 }; // ~55m from both
    expect(findAutoVisit(pos, 10, houses, new Set())).toBeNull();
  });

  it('returns null when GPS accuracy is too poor to trust', () => {
    const pos = { lat: 32.00005, lng: 34.8 };
    expect(findAutoVisit(pos, 80, houses, new Set())).toBeNull();
  });

  it('respects a custom radius', () => {
    const pos = { lat: 32.0003, lng: 34.8 }; // ~33m from a
    expect(findAutoVisit(pos, 10, houses, new Set(), 40)).toBe('a');
  });

  it('returns null for an empty house list', () => {
    expect(findAutoVisit({ lat: 32, lng: 34.8 }, 5, [], new Set())).toBeNull();
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
