import { useEffect } from 'react';
import L from 'leaflet';
import { TileLayer, useMap } from 'react-leaflet';
import type { LatLng } from '../lib/types';

// שכונת עבר הירדן, קרית אונו (גינת עבר הירדן)
const NEIGHBOURHOOD: LatLng = { lat: 32.0508, lng: 34.8581 };

// Fallback center: env override "lat,lng", else the neighbourhood.
export function defaultCenter(): LatLng {
  const raw = import.meta.env.VITE_MAP_CENTER as string | undefined;
  const [lat, lng] = (raw ?? '').split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && raw ? { lat, lng } : NEIGHBOURHOOD;
}

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** OpenStreetMap tiles. */
export function OsmTiles() {
  return <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution={OSM_ATTRIBUTION} />;
}

/** Leaflet caches its container size; re-measure whenever the container resizes (tabs, rotation). */
export function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

// Emoji-in-a-div icons avoid Leaflet's default PNG markers (which break under bundlers).
const emojiIcon = (emoji: string, className: string) =>
  L.divIcon({ html: emoji, className: `marker ${className}`, iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -16] });

const groupIcons = new Map<string, L.DivIcon>();

interface GroupState {
  /** Houses here not yet visited. */
  remaining: number;
  total: number;
  /** Houses here that still have candy. */
  available: number;
}

/**
 * Pumpkin while there are houses to visit (badge = how many left in a building),
 * a golden "collected" candy coin when all visited, grey pumpkin when out of candy.
 * Icons are cached so re-renders don't rebuild the marker (which would close an open popup).
 */
export function groupIcon({ remaining, total, available }: GroupState): L.DivIcon {
  const out = available === 0 && remaining > 0;
  const done = remaining === 0;
  const key = `${remaining}/${total}/${out ? 'out' : 'in'}`;
  let icon = groupIcons.get(key);
  if (!icon) {
    const badge = total > 1 && !done && !out ? `<span class="marker-badge">${remaining}</span>` : '';
    icon = L.divIcon({
      html: done ? '<span class="marker-coin">🍬</span>' : `🎃${badge}`,
      className: `marker ${done ? 'marker-done' : out ? 'marker-out' : 'marker-todo'}`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -16],
    });
    groupIcons.set(key, icon);
  }
  return icon;
}

/** Visited coins sit underneath, so pumpkins still to visit are never hidden by them. */
export function markerZOffset({ remaining }: { remaining: number }): number {
  return remaining === 0 ? -1000 : 0;
}

export const pinIcon = emojiIcon('🏠', 'marker-pin');
export const meIcon = L.divIcon({ html: '', className: 'me-dot', iconSize: [18, 18], iconAnchor: [9, 9] });
