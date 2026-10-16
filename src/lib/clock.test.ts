import { describe, it, expect } from 'vitest';
import { parseNowOverride } from './clock';

describe('parseNowOverride (dev-only ?now= for previews)', () => {
  it('reads an ISO time from ?now=, as Israel time when no offset is given', () => {
    expect(parseNowOverride('?now=2026-10-31T17:05', true)?.toISOString()).toBe('2026-10-31T15:05:00.000Z');
  });

  it('respects an explicit offset', () => {
    expect(parseNowOverride('?now=2026-10-31T15:05:00Z', true)?.toISOString()).toBe('2026-10-31T15:05:00.000Z');
  });

  it('is ignored in production builds', () => {
    expect(parseNowOverride('?now=2026-10-31T17:05', false)).toBeNull();
  });

  it('ignores missing or invalid values', () => {
    expect(parseNowOverride('', true)).toBeNull();
    expect(parseNowOverride('?now=banana', true)).toBeNull();
  });
});
