import { describe, it, expect } from 'vitest';
import { HALLOWEEN_START, timeLeft } from './countdown';

describe('HALLOWEEN_START', () => {
  it('is 31 Oct 2026 at 17:00 Israel time (UTC+2 after DST ends) = 15:00 UTC', () => {
    expect(HALLOWEEN_START.toISOString()).toBe('2026-10-31T15:00:00.000Z');
  });
});

describe('timeLeft', () => {
  const target = new Date('2026-10-31T15:00:00Z');

  it('splits the remaining time into days, hours, minutes, seconds', () => {
    const now = new Date('2026-10-16T12:30:15Z');
    expect(timeLeft(now, target)).toEqual({ done: false, days: 15, hours: 2, minutes: 29, seconds: 45 });
  });

  it('counts the final second', () => {
    expect(timeLeft(new Date('2026-10-31T14:59:59Z'), target)).toEqual({
      done: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 1,
    });
  });

  it('is done at the start time', () => {
    expect(timeLeft(target, target).done).toBe(true);
  });

  it('is done afterwards, with zeros', () => {
    expect(timeLeft(new Date('2026-10-31T18:00:00Z'), target)).toEqual({
      done: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('rounds partial seconds up so the display never shows 0 before the start', () => {
    expect(timeLeft(new Date('2026-10-31T14:59:59.500Z'), target).seconds).toBe(1);
  });
});
