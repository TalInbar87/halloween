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

export function OsmTiles() {
  return (
    <TileLayer
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    />
  );
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

/**
 * Pumpkin until every apartment at this spot is visited, then a check mark.
 * Buildings with several apartments show how many are left. Icons are cached so
 * re-renders don't rebuild the marker (which would close an open popup).
 */
export function groupIcon(remaining: number, total: number): L.DivIcon {
  const key = `${remaining}/${total}`;
  let icon = groupIcons.get(key);
  if (!icon) {
    const done = remaining === 0;
    const badge = total > 1 && !done ? `<span class="marker-badge">${remaining}</span>` : '';
    icon = L.divIcon({
      html: `${done ? '✅' : '🎃'}${badge}`,
      className: `marker ${done ? 'marker-done' : 'marker-todo'}`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -16],
    });
    groupIcons.set(key, icon);
  }
  return icon;
}
export const pinIcon = emojiIcon('🏠', 'marker-pin');
export const meIcon = L.divIcon({ html: '', className: 'me-dot', iconSize: [18, 18], iconAnchor: [9, 9] });
