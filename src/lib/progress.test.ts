import { describe, it, expect } from 'vitest';
import { loadVisited, saveVisited, toggleVisited, loadView, saveView, loadMapTheme, saveMapTheme } from './progress';

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

describe('map/table view preference', () => {
  it('defaults to the map', () => {
    expect(loadView(memoryStorage())).toBe('map');
  });

  it('round-trips the table view', () => {
    const s = memoryStorage();
    saveView(s, 'table');
    expect(loadView(s)).toBe('table');
  });

  it('ignores unknown values', () => {
    const s = memoryStorage();
    s.setItem('halloween.view.v1', JSON.stringify('grid'));
    expect(loadView(s)).toBe('map');
  });

  it('survives storage that throws', () => {
    expect(loadView(throwingStorage())).toBe('map');
    expect(() => saveView(throwingStorage(), 'table')).not.toThrow();
  });
});

describe('map theme preference', () => {
  it('defaults to the dark Halloween map', () => {
    expect(loadMapTheme(memoryStorage())).toBe('dark');
  });

  it('round-trips the light map', () => {
    const s = memoryStorage();
    saveMapTheme(s, 'light');
    expect(loadMapTheme(s)).toBe('light');
  });

  it('survives storage that throws', () => {
    expect(loadMapTheme(throwingStorage())).toBe('dark');
  });
});
