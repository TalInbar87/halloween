import { describe, it, expect } from 'vitest';
import { ACCESS_TTL_MS, clearAccess, loadAccess, saveAccess } from './access';

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

describe('stays logged in for 5 hours', () => {
  const t0 = Date.UTC(2026, 9, 31, 15, 0, 0);

  it('is 5 hours', () => {
    expect(ACCESS_TTL_MS).toBe(5 * 60 * 60 * 1000);
  });

  it('is remembered for 5 hours after entering it', () => {
    const s = memoryStorage();
    saveAccess(s, 'ourstreet', t0);
    expect(loadAccess(s, t0 + ACCESS_TTL_MS - 1000)).toBe('ourstreet');
  });

  it('is forgotten (and cleared) after 5 hours', () => {
    const s = memoryStorage();
    saveAccess(s, 'ourstreet', t0);
    expect(loadAccess(s, t0 + ACCESS_TTL_MS + 1)).toBeNull();
    expect(s.getItem('halloween.access.v1')).toBeNull();
  });

  it('asks again for a password saved by the older version (no expiry stored)', () => {
    const s = memoryStorage();
    s.setItem('halloween.access.v1', JSON.stringify('ourstreet'));
    expect(loadAccess(s, t0)).toBeNull();
  });
});
