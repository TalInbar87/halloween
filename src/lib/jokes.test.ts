import { describe, it, expect } from 'vitest';
import { JOKES, pickJoke } from './jokes';

describe('JOKES', () => {
  it('has the six phrases, each with emoji', () => {
    expect(JOKES).toHaveLength(6);
    for (const j of JOKES) expect(j).toMatch(/\p{Extended_Pictographic}/u);
  });

  it('includes the exact wording', () => {
    expect(JOKES).toContain('שקט, אני סופר סוכריות 🤓🍬');
    expect(JOKES.some((j) => j.startsWith('אם תראו אותי עם שקית ריקה - לא ראיתם כלום...'))).toBe(true);
  });
});

describe('pickJoke', () => {
  it('maps a random number to an index', () => {
    expect(pickJoke(() => 0)).toBe(0);
    expect(pickJoke(() => 0.999)).toBe(JOKES.length - 1);
  });

  it('never repeats the previous joke', () => {
    expect(pickJoke(() => 0, 0)).not.toBe(0);
    for (let prev = 0; prev < JOKES.length; prev++) {
      for (const r of [0, 0.2, 0.5, 0.8, 0.999]) expect(pickJoke(() => r, prev)).not.toBe(prev);
    }
  });

  it('can reach every joke', () => {
    const seen = new Set(Array.from({ length: 50 }, (_, i) => pickJoke(() => i / 50)));
    expect(seen.size).toBe(JOKES.length);
  });
});
