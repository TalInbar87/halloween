import { describe, it, expect } from 'vitest';
import { groupIcon, markerZOffset } from './mapShared';

const html = (icon: ReturnType<typeof groupIcon>) => String(icon.options.html);
const cls = (icon: ReturnType<typeof groupIcon>) => String(icon.options.className);

describe('groupIcon', () => {
  it('is a pumpkin while there are houses to visit', () => {
    expect(html(groupIcon({ remaining: 1, total: 1, available: 1 }))).toContain('🎃');
  });

  it('shows how many are left in a building', () => {
    expect(html(groupIcon({ remaining: 2, total: 3, available: 3 }))).toContain('>2<');
  });

  it('is a golden "collected" candy coin when all visited — no green check mark', () => {
    const icon = groupIcon({ remaining: 0, total: 2, available: 2 });
    expect(html(icon)).toContain('🍬');
    expect(html(icon)).toContain('marker-coin');
    expect(html(icon)).not.toContain('✅');
    expect(cls(icon)).toContain('marker-done');
  });

  it('is a grey pumpkin when every house here is out of candy', () => {
    const icon = groupIcon({ remaining: 1, total: 1, available: 0 });
    expect(cls(icon)).toContain('marker-out');
  });

  it('caches icons so re-renders do not rebuild markers', () => {
    expect(groupIcon({ remaining: 1, total: 2, available: 2 })).toBe(groupIcon({ remaining: 1, total: 2, available: 2 }));
  });
});

describe('markerZOffset', () => {
  it('draws visited coins underneath, so nearby pumpkins still to visit stay on top', () => {
    expect(markerZOffset({ remaining: 0 })).toBeLessThan(markerZOffset({ remaining: 1 }));
  });

  it('leaves houses still to visit at the normal level', () => {
    expect(markerZOffset({ remaining: 3 })).toBe(0);
  });
});
