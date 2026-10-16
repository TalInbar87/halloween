import { describe, it, expect } from 'vitest';
import { groupIcon } from './mapShared';

const html = (icon: ReturnType<typeof groupIcon>) => String(icon.options.html);
const cls = (icon: ReturnType<typeof groupIcon>) => String(icon.options.className);

describe('groupIcon', () => {
  it('is a pumpkin while there are houses to visit', () => {
    expect(html(groupIcon({ remaining: 1, total: 1, available: 1 }))).toContain('🎃');
  });

  it('shows how many are left in a building', () => {
    expect(html(groupIcon({ remaining: 2, total: 3, available: 3 }))).toContain('>2<');
  });

  it('is a check mark when all visited', () => {
    expect(html(groupIcon({ remaining: 0, total: 2, available: 2 }))).toContain('✅');
  });

  it('is a grey pumpkin when every house here is out of candy', () => {
    const icon = groupIcon({ remaining: 1, total: 1, available: 0 });
    expect(cls(icon)).toContain('marker-out');
  });

  it('caches icons so re-renders do not rebuild markers', () => {
    expect(groupIcon({ remaining: 1, total: 2, available: 2 })).toBe(groupIcon({ remaining: 1, total: 2, available: 2 }));
  });
});
