import { describe, it, expect, vi } from 'vitest';
import { geocodeAddress, buildGeocodeUrl, reverseGeocode, buildReverseUrl } from './geocode';

describe('buildReverseUrl', () => {
  it('targets Nominatim reverse in Hebrew at house zoom', () => {
    const url = new URL(buildReverseUrl({ lat: 32.05, lng: 34.858 }));
    expect(url.pathname).toBe('/reverse');
    expect(url.searchParams.get('lat')).toBe('32.05');
    expect(url.searchParams.get('lon')).toBe('34.858');
    expect(url.searchParams.get('accept-language')).toBe('he');
    expect(url.searchParams.get('zoom')).toBe('18');
  });
});

describe('reverseGeocode', () => {
  const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body });

  it('builds "street number, city" from address parts', async () => {
    const fetchFn = ok({ address: { road: 'הירדן', house_number: '12', city: 'קרית אונו' }, display_name: 'long' });
    expect(await reverseGeocode({ lat: 32.05, lng: 34.858 }, fetchFn)).toBe('הירדן 12, קרית אונו');
  });

  it('falls back to town and omits a missing house number', async () => {
    const fetchFn = ok({ address: { road: 'הירדן', town: 'קרית אונו' } });
    expect(await reverseGeocode({ lat: 32.05, lng: 34.858 }, fetchFn)).toBe('הירדן, קרית אונו');
  });

  it('falls back to display_name when there is no road', async () => {
    const fetchFn = ok({ address: {}, display_name: 'גינת עבר הירדן, קרית אונו' });
    expect(await reverseGeocode({ lat: 32.05, lng: 34.858 }, fetchFn)).toBe('גינת עבר הירדן, קרית אונו');
  });

  it('returns null when nothing usable comes back', async () => {
    expect(await reverseGeocode({ lat: 32.05, lng: 34.858 }, ok({ error: 'Unable to geocode' }))).toBeNull();
  });

  it('throws on an HTTP error', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    await expect(reverseGeocode({ lat: 32.05, lng: 34.858 }, fetchFn)).rejects.toThrow();
  });
});

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
