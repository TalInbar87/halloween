import { describe, it, expect } from 'vitest';
import { loadVisited, saveVisited, toggleVisited, loadOwnedHouses, saveOwnedHouse, forgetOwnedHouse } from './progress';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

const throwingStorage = (): Storage =>
  ({
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  }) as unknown as Storage;

describe('visited progress', () => {
  it('starts empty', () => {
    expect(loadVisited(memoryStorage()).size).toBe(0);
  });

  it('round-trips through storage', () => {
    const s = memoryStorage();
    saveVisited(s, new Set(['a', 'b']));
    expect([...loadVisited(s)].sort()).toEqual(['a', 'b']);
  });

  it('ignores corrupt data', () => {
    const s = memoryStorage();
    s.setItem('halloween.visited.v1', '{not json');
    expect(loadVisited(s).size).toBe(0);
  });

  it('ignores non-string entries', () => {
    const s = memoryStorage();
    s.setItem('halloween.visited.v1', JSON.stringify(['a', 5, null]));
    expect([...loadVisited(s)]).toEqual(['a']);
  });

  it('survives storage that throws', () => {
    const s = throwingStorage();
    expect(loadVisited(s).size).toBe(0);
    expect(() => saveVisited(s, new Set(['a']))).not.toThrow();
  });

  it('toggles without mutating the input set', () => {
    const before = new Set(['a']);
    const added = toggleVisited(before, 'b');
    const removed = toggleVisited(added, 'a');
    expect([...before]).toEqual(['a']);
    expect([...added].sort()).toEqual(['a', 'b']);
    expect([...removed]).toEqual(['b']);
  });
});

describe('owned houses (removal tokens)', () => {
  it('saves and loads a token per house', () => {
    const s = memoryStorage();
    saveOwnedHouse(s, 'h1', 'tok1');
    saveOwnedHouse(s, 'h2', 'tok2');
    expect(loadOwnedHouses(s)).toEqual({ h1: 'tok1', h2: 'tok2' });
  });

  it('forgets a house', () => {
    const s = memoryStorage();
    saveOwnedHouse(s, 'h1', 'tok1');
    forgetOwnedHouse(s, 'h1');
    expect(loadOwnedHouses(s)).toEqual({});
  });

  it('ignores corrupt data', () => {
    const s = memoryStorage();
    s.setItem('halloween.owned.v1', '[1,2]');
    expect(loadOwnedHouses(s)).toEqual({});
  });

  it('survives storage that throws', () => {
    expect(loadOwnedHouses(throwingStorage())).toEqual({});
    expect(() => saveOwnedHouse(throwingStorage(), 'h', 't')).not.toThrow();
  });
});
