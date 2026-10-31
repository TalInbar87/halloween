// "Add to home screen". Deliberately no service worker: the site always loads the
// current version, so nobody gets stuck on an old one during the event.

export type InstallPlatform = 'ios' | 'android' | null;

const DISMISSED_KEY = 'halloween.install.dismissed.v1';

export function detectInstallPlatform(userAgent: string, maxTouchPoints: number): InstallPlatform {
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return 'ios'; // iPadOS reports itself as a Mac
  if (/Android/.test(userAgent)) return 'android';
  return null;
}

/** Opened from the home-screen icon rather than a browser tab. */
export function isStandalone(win: Window): boolean {
  const iosStandalone = (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || win.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function isInstallDismissed(storage: Storage): boolean {
  try {
    return storage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstall(storage: Storage): void {
  try {
    storage.setItem(DISMISSED_KEY, '1');
  } catch {
    // the banner just shows again next visit
  }
}
