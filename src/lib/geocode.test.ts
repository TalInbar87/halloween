import { describe, it, expect, vi } from 'vitest';
import { geocodeAddress, buildGeocodeUrl } from './geocode';

describe('buildGeocodeUrl', () => {
  it('targets Nominatim, restricted to Israel, in Hebrew', () => {
    const url = new URL(buildGeocodeUrl('הרצל 10'));
    expect(url.origin).toBe('https://nominatim.openstreetmap.org');
    expect(url.searchParams.get('q')).toBe('הרצל 10');
    expect(url.searchParams.get('countrycodes')).toBe('il');
    expect(url.searchParams.get('accept-language')).toBe('he');
    expect(url.searchParams.get('format')).toBe('jsonv2');
  });
});

describe('geocodeAddress', () => {
  it('maps results to lat/lng/label', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '31.96', lon: '34.80', display_name: 'הרצל 10, ראשון לציון' }],
    });
    const results = await geocodeAddress('הרצל 10', fetchFn);
    expect(results).toEqual([{ lat: 31.96, lng: 34.8, label: 'הרצל 10, ראשון לציון' }]);
  });

  it('drops malformed results', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: 'x', lon: '34.8', display_name: 'bad' }, { foo: 1 }],
    });
    expect(await geocodeAddress('abc', fetchFn)).toEqual([]);
  });

  it('returns [] for a too-short query without calling the network', async () => {
    const fetchFn = vi.fn();
    expect(await geocodeAddress(' a ', fetchFn)).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('throws on an HTTP error', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => [] });
    await expect(geocodeAddress('הרצל 10', fetchFn)).rejects.toThrow();
  });

  it('handles a non-array response', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: 'x' }) });
    expect(await geocodeAddress('הרצל 10', fetchFn)).toEqual([]);
  });
});
