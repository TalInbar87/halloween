// The welcome popup shows at most once a day, tracked by a 24-hour cookie.

export const WELCOME_COOKIE = 'halloween_welcome';
const ONE_DAY_SECONDS = 24 * 60 * 60;

type CookieDoc = { cookie: string };

export function shouldShowWelcome(doc: CookieDoc): boolean {
  try {
    return !doc.cookie.split(';').some((c) => c.trim().startsWith(`${WELCOME_COOKIE}=`));
  } catch {
    return true; // cookies blocked: show it (it can still be closed)
  }
}

export function markWelcomeSeen(doc: CookieDoc): void {
  try {
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    doc.cookie = `${WELCOME_COOKIE}=1; max-age=${ONE_DAY_SECONDS}; path=/; SameSite=Lax${secure}`;
  } catch {
    // cookies blocked: the popup will just show again next visit
  }
}
