import { describe, it, expect } from 'vitest';
import { JOKES, loadJokeBag, nextJoke, saveJokeBag, type JokeBag } from './jokes';

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

/** Deterministic pseudo-random for tests. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

function draw(n: number, random = seeded(7), bag: JokeBag = { queue: [] }) {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = nextJoke(bag, random);
    out.push(r.index);
    bag = r.bag;
  }
  return { out, bag };
}

describe('JOKES', () => {
  it('has the six phrases, each with its own emoji', () => {
    expect(JOKES).toHaveLength(6);
    for (const j of JOKES) {
      expect(j.text.length).toBeGreaterThan(10);
      expect(j.emoji).toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('keeps the exact wording', () => {
    expect(JOKES.map((j) => j.text)).toContain('שקט, אני סופר סוכריות');
    expect(JOKES.map((j) => j.text)).toContain('אם תראו אותי עם שקית ריקה - לא ראיתם כלום...');
  });
});

describe('nextJoke (shuffle bag)', () => {
  it('shows every joke once before any repeats', () => {
    const { out } = draw(JOKES.length);
    expect(new Set(out).size).toBe(JOKES.length);
  });

  it('starts a fresh full round after that, again with no repeats inside it', () => {
    const { out } = draw(JOKES.length * 3, seeded(42));
    for (let round = 0; round < 3; round++) {
      const slice = out.slice(round * JOKES.length, (round + 1) * JOKES.length);
      expect(new Set(slice).size).toBe(JOKES.length);
    }
  });

  it('never shows the same joke twice in a row, even across rounds', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { out } = draw(JOKES.length * 4, seeded(seed));
      for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1]);
    }
  });

  it('does not mutate the bag it was given', () => {
    const bag: JokeBag = { queue: [3, 1, 2], last: 0 };
    nextJoke(bag, seeded(1));
    expect(bag).toEqual({ queue: [3, 1, 2], last: 0 });
  });

  it('is actually shuffled (not always the same order)', () => {
    const orders = new Set(
      Array.from({ length: 10 }, (_, s) => draw(JOKES.length, seeded(s + 1)).out.join(',')),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('joke bag persistence (so a page refresh does not restart the round)', () => {
  it('round-trips through storage', () => {
    const s = memoryStorage();
    const { bag } = draw(2);
    saveJokeBag(s, bag);
    expect(loadJokeBag(s)).toEqual(bag);
  });

  it('starts empty when nothing is stored', () => {
    expect(loadJokeBag(memoryStorage())).toEqual({ queue: [] });
  });

  it('ignores corrupt or out-of-range data', () => {
    const s = memoryStorage();
    s.setItem('halloween.jokes.v1', JSON.stringify({ queue: [1, 99, 'x', 1], last: 42 }));
    expect(loadJokeBag(s)).toEqual({ queue: [1] });
    s.setItem('halloween.jokes.v1', '{nope');
    expect(loadJokeBag(s)).toEqual({ queue: [] });
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(loadJokeBag(broken)).toEqual({ queue: [] });
    expect(() => saveJokeBag(broken, { queue: [1] })).not.toThrow();
  });
});
