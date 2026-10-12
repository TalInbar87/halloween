import { useEffect, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { House, LatLng } from '../lib/types';
import { findAutoVisit, nearestUnvisited } from '../lib/geo';
import { useGeolocation } from '../hooks/useGeolocation';
import { ProgressBar } from './ProgressBar';
import { AutoResize, OsmTiles, defaultCenter, doneIcon, meIcon, pumpkinIcon } from './mapShared';

interface Props {
  houses: House[];
  visited: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onAutoVisit: (id: string) => void;
}

function FitHouses({ houses }: { houses: House[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || houses.length === 0) return;
    fitted.current = true;
    map.fitBounds(L.latLngBounds(houses.map((h) => [h.lat, h.lng])), { padding: [40, 40], maxZoom: 17 });
  }, [map, houses]);
  return null;
}

function Follow({ position, active }: { position: LatLng | null; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active && position) map.panTo([position.lat, position.lng]);
  }, [map, active, position]);
  return null;
}

const GEO_MESSAGES: Record<string, string> = {
  locating: 'מחפשים את המיקום שלכם...',
  denied: 'אין הרשאת מיקום. אפשר לאשר בהגדרות הדפדפן, או פשוט לסמן בתים ידנית.',
  error: 'לא מצליחים לקבל מיקום כרגע.',
  unsupported: 'הדפדפן הזה לא תומך במיקום.',
};

export function KidMap({ houses, visited, onToggle, onAutoVisit }: Props) {
  const [gpsOn, setGpsOn] = useState(false);
  const [follow, setFollow] = useState(true);
  const geo = useGeolocation(gpsOn);
  const me = geo.status === 'ok' ? geo.position : null;
  const center = defaultCenter();

  // Auto check-off when standing at a house.
  useEffect(() => {
    if (geo.status !== 'ok') return;
    const id = findAutoVisit(geo.position, geo.accuracy, houses, visited);
    if (id) onAutoVisit(id);
  }, [geo, houses, visited, onAutoVisit]);

  const next = me ? nearestUnvisited(me, houses, visited) : null;
  const visitedCount = houses.filter((h) => visited.has(h.id)).length;

  return (
    <div className="kid">
      <div className="kid-top">
        <ProgressBar visited={visitedCount} total={houses.length} />
        {!gpsOn ? (
          <button type="button" className="btn primary" onClick={() => setGpsOn(true)}>
            הראו איפה אני
          </button>
        ) : (
          <div className="gps-row">
            {GEO_MESSAGES[geo.status] && <span className="hint">{GEO_MESSAGES[geo.status]}</span>}
            {next && (
              <span className="hint">
                הבית הקרוב: {next.house.address} ({Math.round(next.meters)} מ׳)
              </span>
            )}
            {me && (
              <button type="button" className={`btn chip ${follow ? 'on' : ''}`} onClick={() => setFollow((f) => !f)}>
                {follow ? 'עוקב אחריי' : 'עקבו אחריי'}
              </button>
            )}
          </div>
        )}
      </div>

      <MapContainer center={[center.lat, center.lng]} zoom={16} className="kid-map">
        <OsmTiles />
        <AutoResize />
        <FitHouses houses={houses} />
        <Follow position={me} active={follow} />
        {houses.map((h) => {
          const done = visited.has(h.id);
          return (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={done ? doneIcon : pumpkinIcon}>
              <Popup>
                <div className="popup">
                  <strong>{h.address}</strong>
                  {h.notes && <p>{h.notes}</p>}
                  <button type="button" className={`btn ${done ? 'secondary' : 'primary'}`} onClick={() => onToggle(h.id)}>
                    {done ? 'בטלו סימון' : 'היינו כאן!'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
        {geo.status === 'ok' && (
          <>
            <Circle
              center={[geo.position.lat, geo.position.lng]}
              radius={geo.accuracy}
              pathOptions={{ color: '#7c4dff', weight: 1, fillOpacity: 0.12 }}
            />
            <Marker position={[geo.position.lat, geo.position.lng]} icon={meIcon} interactive={false} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
