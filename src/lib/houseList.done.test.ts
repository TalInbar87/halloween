import { describe, it, expect } from 'vitest';
import { completedBuilding, isAllDone } from './houseList';
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


describe('completedBuilding', () => {
  const apt = (id: string, address: string, over: Partial<House> = {}) => house(id, 32.05, 34.858, { address, ...over });
  const houses = [
    apt('a', 'נהר הירדן 27', { apartment: '12' }),
    apt('b', 'נהר הירדן 27', { apartment: '29' }),
    apt('c', 'נהר הירדן 27', { apartment: '30' }),
    { ...apt('d', 'יפה נוף 38'), lat: 32.06 },
  ];

  it('returns the building address when marking its last apartment', () => {
    expect(completedBuilding(houses, new Set(['a', 'b']), 'c')).toBe('נהר הירדן 27');
  });

  it('is null while other apartments in the building are left', () => {
    expect(completedBuilding(houses, new Set(['a']), 'c')).toBeNull();
  });

  it('counts apartments that ran out of candy as done', () => {
    const withOut = houses.map((h) => (h.id === 'b' ? { ...h, out_of_candy: true } : h));
    expect(completedBuilding(withOut, new Set(['a']), 'c')).toBe('נהר הירדן 27');
  });

  it('is null for a single-family house', () => {
    expect(completedBuilding(houses, new Set(), 'd')).toBeNull();
  });
});
