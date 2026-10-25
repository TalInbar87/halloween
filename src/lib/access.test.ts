import { describe, it, expect } from 'vitest';
import { clearAccess, loadAccess, saveAccess } from './access';

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

const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;

describe('neighbourhood password on this phone', () => {
  it('is empty until entered', () => {
    expect(loadAccess(memoryStorage())).toBeNull();
  });

  it('is remembered once entered, and can be forgotten', () => {
    const s = memoryStorage();
    saveAccess(s, 'ourstreet');
    expect(loadAccess(s)).toBe('ourstreet');
    clearAccess(s);
    expect(loadAccess(s)).toBeNull();
  });

  it('survives storage that throws (just asks again next time)', () => {
    expect(loadAccess(broken)).toBeNull();
    expect(() => saveAccess(broken, 'x')).not.toThrow();
    expect(() => clearAccess(broken)).not.toThrow();
  });
});
