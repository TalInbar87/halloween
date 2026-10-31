import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { detectInstallPlatform, dismissInstall, isInstallDismissed, isStandalone } from './install';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

describe('detectInstallPlatform', () => {
  it('finds iPhones, in Safari and in Chrome', () => {
    expect(detectInstallPlatform(IPHONE, 5)).toBe('ios');
    expect(detectInstallPlatform(IPHONE_CHROME, 5)).toBe('ios');
  });

  it('finds iPads, which pretend to be Macs but have touch', () => {
    expect(detectInstallPlatform(IPAD, 5)).toBe('ios');
  });

  it('finds Android', () => {
    expect(detectInstallPlatform(ANDROID, 5)).toBe('android');
  });

  it('offers nothing on a computer', () => {
    expect(detectInstallPlatform(DESKTOP, 0)).toBeNull();
    expect(detectInstallPlatform(IPAD, 0)).toBeNull();
  });
});

describe('isStandalone', () => {
  const win = (matches: boolean, standalone?: boolean) =>
    ({ matchMedia: () => ({ matches }), navigator: { standalone } }) as unknown as Window;

  it('is true when opened from the home-screen icon', () => {
    expect(isStandalone(win(true))).toBe(true);
    expect(isStandalone(win(false, true))).toBe(true);
  });

  it('is false in a normal browser tab', () => {
    expect(isStandalone(win(false))).toBe(false);
  });
});

describe('dismissing the banner', () => {
  function memory(): Storage {
    const d = new Map<string, string>();
    return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v) } as unknown as Storage;
  }

  it('is remembered on the phone', () => {
    const s = memory();
    expect(isInstallDismissed(s)).toBe(false);
    dismissInstall(s);
    expect(isInstallDismissed(s)).toBe(true);
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('x');
      },
      setItem: () => {
        throw new Error('x');
      },
    } as unknown as Storage;
    expect(isInstallDismissed(broken)).toBe(false);
    expect(() => dismissInstall(broken)).not.toThrow();
  });
});

describe('web app manifest', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  const html = readFileSync('index.html', 'utf8');

  it('opens full screen from the site root, in Hebrew', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.dir).toBe('rtl');
    expect(manifest.lang).toBe('he');
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  it('has the icon sizes Android needs, and they exist', () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    for (const i of manifest.icons) expect(() => readFileSync(`public${i.src}`)).not.toThrow();
  });

  it('is linked from the page, with the iPhone tags', () => {
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('apple-mobile-web-app-title');
  });
});
