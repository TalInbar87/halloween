import { describe, it, expect } from 'vitest';
import { WELCOME_COOKIE, markWelcomeSeen, shouldShowWelcome } from './welcome';

function fakeDoc(cookie = '') {
  const written: string[] = [];
  return {
    written,
    get cookie() {
      return cookie;
    },
    set cookie(v: string) {
      written.push(v);
    },
  };
}

describe('shouldShowWelcome', () => {
  it('shows when there is no cookie', () => {
    expect(shouldShowWelcome(fakeDoc(''))).toBe(true);
  });

  it('hides when the cookie is present', () => {
    expect(shouldShowWelcome(fakeDoc(`foo=1; ${WELCOME_COOKIE}=1; bar=2`))).toBe(false);
  });

  it('is not fooled by a cookie whose name only contains ours', () => {
    expect(shouldShowWelcome(fakeDoc(`x${WELCOME_COOKIE}=1`))).toBe(true);
  });

  it('shows (rather than crashing) when cookies are blocked', () => {
    const blocked = {
      get cookie(): string {
        throw new Error('SecurityError');
      },
    };
    expect(shouldShowWelcome(blocked)).toBe(true);
  });
});

describe('markWelcomeSeen', () => {
  it('sets a 24-hour cookie for the whole site', () => {
    const doc = fakeDoc();
    markWelcomeSeen(doc);
    expect(doc.written).toHaveLength(1);
    expect(doc.written[0]).toMatch(new RegExp(`^${WELCOME_COOKIE}=1;`));
    expect(doc.written[0]).toContain('max-age=86400');
    expect(doc.written[0]).toContain('path=/');
    expect(doc.written[0]).toContain('SameSite=Lax');
  });

  it('does not throw when cookies are blocked', () => {
    const blocked = {
      get cookie() {
        return '';
      },
      set cookie(_v: string) {
        throw new Error('SecurityError');
      },
    };
    expect(() => markWelcomeSeen(blocked)).not.toThrow();
  });
});
