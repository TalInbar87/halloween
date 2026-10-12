// Address → coordinates via OpenStreetMap Nominatim (free, max 1 req/sec — we only
// call it when someone presses "find", never on keystroke).

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

type FetchLike = (url: string) => Promise<{ ok: boolean; status?: number; json: () => Promise<unknown> }>;

export function buildGeocodeUrl(query: string): string {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('countrycodes', 'il');
  url.searchParams.set('accept-language', 'he');
  url.searchParams.set('limit', '5');
  return url.toString();
}

export function buildReverseUrl(point: { lat: number; lng: number }): string {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(point.lat));
  url.searchParams.set('lon', String(point.lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('accept-language', 'he');
  url.searchParams.set('zoom', '18');
  return url.toString();
}

/** Coordinates → "street number, city" (or Nominatim's full label), null if unknown. */
export async function reverseGeocode(
  point: { lat: number; lng: number },
  fetchFn: FetchLike = fetch,
): Promise<string | null> {
  const res = await fetchFn(buildReverseUrl(point));
  if (!res.ok) throw new Error(`reverse_failed_${res.status ?? ''}`);
  const data = (await res.json()) as { address?: Record<string, string>; display_name?: unknown };
  const a = data?.address ?? {};
  if (a.road) {
    const street = [a.road, a.house_number].filter(Boolean).join(' ');
    const city = a.city ?? a.town ?? a.village;
    return [street, city].filter(Boolean).join(', ');
  }
  return typeof data?.display_name === 'string' ? data.display_name : null;
}

export async function geocodeAddress(query: string, fetchFn: FetchLike = fetch): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const res = await fetchFn(buildGeocodeUrl(q));
  if (!res.ok) throw new Error(`geocode_failed_${res.status ?? ''}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.flatMap((item: Record<string, unknown>) => {
    const lat = Number(item?.lat);
    const lng = Number(item?.lon);
    const label = item?.display_name;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || typeof label !== 'string') return [];
    return [{ lat, lng, label }];
  });
}
