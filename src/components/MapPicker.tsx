import { useEffect } from 'react';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng } from '../lib/types';
import type { PickerProps } from './AddHouseForm';
import { AutoResize, OsmTiles, defaultCenter, pinIcon } from './mapShared';

function ClickToPlace({ onChange }: { onChange: (v: LatLng) => void }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FlyTo({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 18));
  }, [map, value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function MapPicker({ value, onChange }: PickerProps) {
  const center = value ?? defaultCenter();

  return (
    <div className="picker">
      <MapContainer center={[center.lat, center.lng]} zoom={value ? 18 : 16} className="picker-map" scrollWheelZoom={false}>
        <OsmTiles />
        <AutoResize />
        <ClickToPlace onChange={onChange} />
        <FlyTo value={value} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = e.target.getLatLng();
                onChange({ lat: ll.lat, lng: ll.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
