import { describe, it, expect } from 'vitest';
import { addressKey, formatAddress, groupByLocation, searchHouses, sortByAddress, splitAddress } from './houseList';
import type { House } from './types';

const house = (id: string, over: Partial<House> = {}): House => ({
  id,
  address: 'הירדן 12, קרית אונו',
  street: null,
  house_number: null,
  apartment: null,
  floor: null,
  building_code: null,
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

  it('appends the building code', () => {
    expect(formatAddress(house('a', { apartment: '4', building_code: '1234#' }))).toBe(
      'הירדן 12, קרית אונו · דירה 4, קוד בניין 1234#',
    );
  });

  it('appends only what exists', () => {
    expect(formatAddress(house('a', { floor: '0' }))).toBe('הירדן 12, קרית אונו · קומה 0');
  });
});

describe('addressKey', () => {
  it.each([
    ['נהר הירדן 27', 'נהר הירדן 27'],
    ['נהר הירדן 27 קרית אונו', 'נהר הירדן 27'],
    ['נהר הירדן 27, קריית אונו', 'נהר הירדן 27'],
    ['  רחוב נהר  הירדן 27 ,קרית-אונו ', 'נהר הירדן 27'],
    ["רח' נהר הירדן 27", 'נהר הירדן 27'],
    ['צה"ל 30, קרית אונו', 'צהל 30'],
    ['נהר הירדן 27, קרית אונו, ישראל', 'נהר הירדן 27'],
  ])('%s → %s', (input, key) => {
    expect(addressKey(input)).toBe(key);
  });

  it('keeps different house numbers apart', () => {
    expect(addressKey('נהר הירדן 27')).not.toBe(addressKey('נהר הירדן 25'));
  });
});

describe('splitAddress', () => {
  it.each([
    ['נהר הירדן 27 קרית אונו', 'נהר הירדן', '27'],
    ['נהר הירדן 25 קריית אונו', 'נהר הירדן', '25'],
    ['רחוב נחל גמלא 8, קרית אונו', 'נחל גמלא', '8'],
    ['יפה נוף 38א', 'יפה נוף', '38א'],
    ['יפה נוף', 'יפה נוף', ''],
  ])('%s → %s / %s', (address, street, houseNumber) => {
    expect(splitAddress(address)).toEqual({ street, houseNumber });
  });
});

describe('groupByLocation', () => {
  it('groups by the street/number columns when they are set', () => {
    const groups = groupByLocation([
      house('a', { address: 'x', street: 'נהר הירדן', house_number: '27', lat: 32.05 }),
      house('b', { address: 'y', street: 'נהר הירדן ', house_number: '27', lat: 32.051 }),
    ]);
    expect(groups).toHaveLength(1);
  });

  it('unites the same street and number written differently (real data)', () => {
    const groups = groupByLocation([
      house('a', { address: 'נהר הירדן 27 קרית אונו', apartment: '29', lat: 32.0505 }),
      house('b', { address: 'נהר הירדן 27', apartment: '12', lat: 32.0512 }), // pins ~80m apart
      house('c', { address: 'נהר הירדן 25 קריית אונו', lat: 32.0509 }),
    ]);
    expect(groups.map((g) => g.houses.map((h) => h.id))).toEqual([['a', 'b'], ['c']]);
  });

  it('puts apartments in the same building into one group', () => {
    const groups = groupByLocation([
      house('a', { apartment: '1' }),
      house('b', { apartment: '2', lat: 32.05001 }), // ~1m away
      house('c', { address: 'אלון 3, קרית אונו', lat: 32.051 }), // another building, ~110m away
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].houses.map((h) => h.id)).toEqual(['a', 'b']);
    expect(groups[1].houses.map((h) => h.id)).toEqual(['c']);
  });

  it('puts apartments with the same address into one group even if their pins are apart', () => {
    const groups = groupByLocation([
      house('a', { address: 'נהר הירדן 23, קרית אונו', apartment: '20' }),
      house('b', { address: ' נהר הירדן 23, קרית אונו ', apartment: '21', lat: 32.0505 }), // ~55m away
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].houses.map((h) => h.id)).toEqual(['a', 'b']);
  });

  it('keeps different addresses far apart in separate groups', () => {
    const groups = groupByLocation([
      house('a', { address: 'נהר הירדן 23' }),
      house('b', { address: 'נהר הירדן 25', lat: 32.0505 }),
    ]);
    expect(groups).toHaveLength(2);
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

describe('sortByAddress', () => {
  it('sorts by street, then house number numerically, then apartment', () => {
    const list = [
      house('a', { address: 'נהר הירדן 27', apartment: '30' }),
      house('b', { address: 'נהר הירדן 10' }),
      house('c', { address: 'נהר הירדן 27', apartment: '12' }),
      house('d', { address: 'אלון 3' }),
      house('e', { address: 'נהר הירדן 9' }),
    ];
    expect(sortByAddress(list).map((h) => h.id)).toEqual(['d', 'e', 'b', 'c', 'a']);
  });

  it('does not mutate the input', () => {
    const list = [house('a', { address: 'ב 1' }), house('b', { address: 'א 1' })];
    sortByAddress(list);
    expect(list.map((h) => h.id)).toEqual(['a', 'b']);
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

  it('caps the number of results by default', () => {
    const many = Array.from({ length: 30 }, (_, i) => house(String(i)));
    expect(searchHouses(many, 'הירדן')).toHaveLength(8);
  });

  it('can return every match', () => {
    const many = Array.from({ length: 30 }, (_, i) => house(String(i)));
    expect(searchHouses(many, 'הירדן', Infinity)).toHaveLength(30);
  });
});
