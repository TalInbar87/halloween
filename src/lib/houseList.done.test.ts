import { describe, it, expect } from 'vitest';
import { isAllDone } from './houseList';
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

