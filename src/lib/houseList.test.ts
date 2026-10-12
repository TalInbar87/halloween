import { describe, it, expect } from 'vitest';
import { formatAddress, groupByLocation, searchHouses } from './houseList';
import type { House } from './types';

const house = (id: string, over: Partial<House> = {}): House => ({
  id,
  address: 'הירדן 12, קרית אונו',
  apartment: null,
  floor: null,
  lat: 32.05,
  lng: 34.858,
  notes: null,
  created_at: '2026-10-12T00:00:00Z',
  ...over,
});

describe('formatAddress', () => {
  it('returns the plain address when there is no apartment or floor', () => {
    expect(formatAddress(house('a'))).toBe('הירדן 12, קרית אונו');
  });

  it('appends apartment and floor', () => {
    expect(formatAddress(house('a', { apartment: '4', floor: '2' }))).toBe('הירדן 12, קרית אונו · דירה 4, קומה 2');
  });

  it('appends only what exists', () => {
    expect(formatAddress(house('a', { floor: '0' }))).toBe('הירדן 12, קרית אונו · קומה 0');
  });
});

describe('groupByLocation', () => {
  it('puts apartments in the same building into one group', () => {
    const groups = groupByLocation([
      house('a', { apartment: '1' }),
      house('b', { apartment: '2', lat: 32.05001 }), // ~1m away
      house('c', { lat: 32.051 }), // ~110m away
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].houses.map((h) => h.id)).toEqual(['a', 'b']);
    expect(groups[1].houses.map((h) => h.id)).toEqual(['c']);
  });

  it('returns an empty list for no houses', () => {
    expect(groupByLocation([])).toEqual([]);
  });

  it('gives each group a stable key from its first house', () => {
    const [g] = groupByLocation([house('a'), house('b')]);
    expect(g.key).toBe('a');
    expect(g.lat).toBe(32.05);
  });
});

describe('searchHouses', () => {
  const list = [
    house('a', { address: 'הירדן 12, קרית אונו', apartment: '4' }),
    house('b', { address: 'צה"ל 30, קרית אונו' }),
    house('c', { address: 'שלמה המלך 5, קרית אונו' }),
  ];

  it('returns nothing for an empty query', () => {
    expect(searchHouses(list, '  ')).toEqual([]);
  });

  it('matches a partial street name', () => {
    expect(searchHouses(list, 'ירד').map((h) => h.id)).toEqual(['a']);
  });

  it('requires every word to match', () => {
    expect(searchHouses(list, 'שלמה 5').map((h) => h.id)).toEqual(['c']);
    expect(searchHouses(list, 'שלמה 7')).toEqual([]);
  });

  it('ignores quote styles (צה"ל vs צהל vs צה״ל)', () => {
    expect(searchHouses(list, 'צהל').map((h) => h.id)).toEqual(['b']);
    expect(searchHouses(list, 'צה״ל').map((h) => h.id)).toEqual(['b']);
  });

  it('matches the apartment number', () => {
    expect(searchHouses(list, 'הירדן דירה 4').map((h) => h.id)).toEqual(['a']);
  });

  it('caps the number of results', () => {
    const many = Array.from({ length: 30 }, (_, i) => house(String(i)));
    expect(searchHouses(many, 'הירדן')).toHaveLength(8);
  });
});
