import { describe, it, expect } from 'vitest';
import { ARRIVED_M, bearingDegrees, formatDistance, isAllDone, pickNextHouse } from './nav';
import type { House } from './types';

const house = (id: string, lat: number, lng: number, over: Partial<House> = {}): House => ({
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
  created_at: 'x',
  ...over,
});

describe('bearingDegrees', () => {
  const from = { lat: 32.05, lng: 34.858 };

  it('is 0 for due north', () => {
    expect(bearingDegrees(from, { lat: 32.06, lng: 34.858 })).toBeCloseTo(0, 0);
  });

  it('is 90 for due east', () => {
    expect(bearingDegrees(from, { lat: 32.05, lng: 34.868 })).toBeCloseTo(90, 0);
  });

  it('is 180 for due south and 270 for due west', () => {
    expect(bearingDegrees(from, { lat: 32.04, lng: 34.858 })).toBeCloseTo(180, 0);
    expect(bearingDegrees(from, { lat: 32.05, lng: 34.848 })).toBeCloseTo(270, 0);
  });
});

describe('formatDistance', () => {
  it.each([
    [7.4, '7 מ׳'],
    [123.6, '124 מ׳'],
    [999, '999 מ׳'],
    [1000, '1.0 ק״מ'],
    [1460, '1.5 ק״מ'],
  ])('%d m → %s', (m, text) => {
    expect(formatDistance(m)).toBe(text);
  });
});

describe('pickNextHouse', () => {
  const me = { lat: 32.05, lng: 34.858 };
  const houses = [
    house('near-visited', 32.0501, 34.858),
    house('near-out', 32.0502, 34.858, { out_of_candy: true }),
    house('mid', 32.051, 34.858),
    house('far', 32.06, 34.858),
  ];

  it('picks the nearest house that is not visited and still has candy', () => {
    expect(pickNextHouse(me, houses, new Set(['near-visited']))?.id).toBe('mid');
  });

  it('returns null when nothing is left', () => {
    expect(pickNextHouse(me, houses, new Set(['near-visited', 'mid', 'far']))).toBeNull();
  });

  it('can skip the house you are already heading to', () => {
    expect(pickNextHouse(me, houses, new Set(['near-visited']), 'mid')?.id).toBe('far');
  });
});

describe('isAllDone', () => {
  const houses = [house('a', 32, 34.8), house('b', 32, 34.8, { out_of_candy: true }), house('c', 32, 34.8)];

  it('is false with no houses', () => {
    expect(isAllDone([], new Set())).toBe(false);
  });

  it('is false while a house with candy is unvisited', () => {
    expect(isAllDone(houses, new Set(['a']))).toBe(false);
  });

  it('is true when every house is visited or out of candy', () => {
    expect(isAllDone(houses, new Set(['a', 'c']))).toBe(true);
  });

  it('is false when nothing was visited even if all are out of candy', () => {
    expect(isAllDone([house('x', 32, 34.8, { out_of_candy: true })], new Set())).toBe(false);
  });
});

describe('ARRIVED_M', () => {
  it('is a short walking distance', () => {
    expect(ARRIVED_M).toBeGreaterThanOrEqual(10);
    expect(ARRIVED_M).toBeLessThanOrEqual(30);
  });
});
