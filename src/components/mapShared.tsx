import { useEffect } from 'react';
import L from 'leaflet';
import { TileLayer, useMap } from 'react-leaflet';
import type { LatLng } from '../lib/types';

// Fallback center: env override "lat,lng", else central Israel.
export function defaultCenter(): LatLng {
  const raw = import.meta.env.VITE_MAP_CENTER as string | undefined;
  const [lat, lng] = (raw ?? '').split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && raw ? { lat, lng } : { lat: 31.97, lng: 34.79 };
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

export const pumpkinIcon = emojiIcon('🎃', 'marker-todo');
export const doneIcon = emojiIcon('✅', 'marker-done');
export const pinIcon = emojiIcon('🏠', 'marker-pin');
export const meIcon = L.divIcon({ html: '', className: 'me-dot', iconSize: [18, 18], iconAnchor: [9, 9] });
