import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { House, LatLng } from '../lib/types';
import { nearestUnvisited } from '../lib/geo';
import { formatAddress, groupByLocation, isAllDone, sortByFloor } from '../lib/houseList';
import { useGeolocation } from '../hooks/useGeolocation';
import { ProgressBar } from './ProgressBar';
import { HouseTable } from './HouseTable';
import { Celebration } from './Celebration';
import { KeepScroll } from './KeepScroll';
import type { View } from '../lib/progress';
import { AutoResize, OsmTiles, defaultCenter, groupIcon, markerZOffset, meIcon } from './mapShared';

interface Props {
  houses: House[];
  visited: ReadonlySet<string>;
  onToggle: (id: string) => void;
  view: View;
  onViewChange: (view: View) => void;
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

/** Centers on the kid once, on the first GPS fix; after that the map pans freely. */
function CenterOnMe({ position }: { position: LatLng | null }) {
  const map = useMap();
  const centered = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const recenter = () => {
    if (position) map.setView([position.lat, position.lng], Math.max(map.getZoom(), 17));
  };

  useEffect(() => {
    if (position && !centered.current) {
      centered.current = true;
      recenter();
    }
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep taps on the button from also reaching the map underneath.
  useEffect(() => {
    if (buttonRef.current) L.DomEvent.disableClickPropagation(buttonRef.current);
  }, [position !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!position) return null;
  return (
    <button ref={buttonRef} type="button" className="recenter" onClick={recenter} aria-label="חזרה למיקום שלי" title="חזרה למיקום שלי">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

const GEO_MESSAGES: Record<string, string> = {
  locating: 'מחפשים את המיקום שלכם...',
  denied: 'אין הרשאת מיקום. אפשר לאשר בהגדרות הדפדפן, או פשוט לסמן בתים ידנית.',
  error: 'לא מצליחים לקבל מיקום כרגע.',
  unsupported: 'הדפדפן הזה לא תומך במיקום.',
};

export function KidMap({ houses, visited, onToggle, view, onViewChange }: Props) {
  const [gpsOn, setGpsOn] = useState(false);
  const geo = useGeolocation(gpsOn);
  const me = geo.status === 'ok' ? geo.position : null;
  const center = defaultCenter();

  // Nearest house still worth walking to (skips houses that ran out of candy).
  const next = me
    ? nearestUnvisited(
        me,
        houses.filter((h) => !h.out_of_candy),
        visited,
      )
    : null;
  const visitedCount = houses.filter((h) => visited.has(h.id)).length;
  // Apartments in a popup go up the building: floor, then apartment.
  const groups = useMemo(
    () => groupByLocation(houses).map((g) => ({ ...g, houses: sortByFloor(g.houses) })),
    [houses],
  );

  return (
    <div className="kid">
      <div className="kid-top">
        <ProgressBar visited={visitedCount} total={houses.length} />
        <div className="view-toggle" role="group" aria-label="תצוגה">
          <button type="button" aria-pressed={view === 'map'} onClick={() => onViewChange('map')}>
            מפה
          </button>
          <button type="button" aria-pressed={view === 'table'} onClick={() => onViewChange('table')}>
            טבלה
          </button>
        </div>
        {!gpsOn ? (
          <button type="button" className="btn primary" onClick={() => setGpsOn(true)}>
            הראו איפה אני
          </button>
        ) : (
          <div className="gps-row">
            {GEO_MESSAGES[geo.status] && <span className="hint">{GEO_MESSAGES[geo.status]}</span>}
            {next && (
              <span className="hint">
                הבית הקרוב: {formatAddress(next.house)} ({Math.round(next.meters)} מ׳)
              </span>
            )}
          </div>
        )}
      </div>

      {view === 'table' ? (
        <HouseTable houses={houses} visited={visited} position={me} onToggle={onToggle} />
      ) : (
        <MapContainer center={[center.lat, center.lng]} zoom={16} className="kid-map">
          <OsmTiles />
          <AutoResize />
          <FitHouses houses={houses} />
          <CenterOnMe position={me} />
          {groups.map((g) => {
            const remaining = g.houses.filter((h) => !visited.has(h.id)).length;
            const available = g.houses.filter((h) => !h.out_of_candy).length;
            return (
              <Marker
                key={g.key}
                position={[g.lat, g.lng]}
                icon={groupIcon({ remaining, total: g.houses.length, available })}
                zIndexOffset={markerZOffset({ remaining })}
              >
                {/* Big buildings (e.g. 7 apartments) scroll inside the popup instead of overflowing the screen. */}
                <Popup maxHeight={280}>
                  <KeepScroll watch={g.houses.map((h) => (visited.has(h.id) ? 1 : 0)).join('')}>
                  <div className="popup">
                    {g.houses.length > 1 && remaining === 0 && <p className="building-done">לא השארתם ממתק אחד בבניין 😋🍬</p>}
                    {g.houses.map((h) => {
                      const done = visited.has(h.id);
                      return (
                        <div key={h.id} className={`popup-house ${done ? 'is-done' : ''}`}>
                          <strong>{formatAddress(h)}</strong>
                          {h.out_of_candy && <span className="out-label">נגמרו הממתקים 😢</span>}
                          {h.notes && <p>{h.notes}</p>}
                          <button
                            type="button"
                            className={`btn ${done ? 'secondary' : 'primary'}`}
                            onClick={() => onToggle(h.id)}
                          >
                            {done ? 'בטלו סימון' : 'היינו כאן!'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  </KeepScroll>
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
      )}

      <Celebration done={isAllDone(houses, visited)} />
    </div>
  );
}
