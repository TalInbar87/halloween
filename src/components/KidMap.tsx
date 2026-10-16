import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { House, LatLng } from '../lib/types';
import { distanceMeters } from '../lib/geo';
import { formatAddress, groupByLocation } from '../lib/houseList';
import { formatDistance, isAllDone, pickNextHouse } from '../lib/nav';
import { useGeolocation } from '../hooks/useGeolocation';
import { ProgressBar } from './ProgressBar';
import { HouseTable } from './HouseTable';
import { NavBar } from './NavBar';
import { Celebration } from './Celebration';
import type { MapTheme, View } from '../lib/progress';
import { AutoResize, OsmTiles, defaultCenter, groupIcon, meIcon, targetIcon } from './mapShared';

interface Props {
  houses: House[];
  visited: ReadonlySet<string>;
  onToggle: (id: string) => void;
  view: View;
  onViewChange: (view: View) => void;
  theme: MapTheme;
  onThemeChange: (theme: MapTheme) => void;
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

/** When navigation starts, show both the kid and the target house. */
function FitRoute({ from, to }: { from: LatLng | null; to: House | null }) {
  const map = useMap();
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!to) {
      fittedFor.current = null;
      return;
    }
    if (!from || fittedFor.current === to.id) return;
    fittedFor.current = to.id;
    map.closePopup();
    map.fitBounds(
      L.latLngBounds([
        [from.lat, from.lng],
        [to.lat, to.lng],
      ]),
      { padding: [60, 60], maxZoom: 18 },
    );
  }, [map, from, to]);
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

export function KidMap({ houses, visited, onToggle, view, onViewChange, theme, onThemeChange }: Props) {
  const [gpsOn, setGpsOn] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const geo = useGeolocation(gpsOn);
  const me = geo.status === 'ok' ? geo.position : null;
  const center = defaultCenter();

  const target = houses.find((h) => h.id === targetId) ?? null;
  const next = me ? pickNextHouse(me, houses, visited) : null;
  const visitedCount = houses.filter((h) => visited.has(h.id)).length;
  const groups = useMemo(() => groupByLocation(houses), [houses]);

  // Navigation is all on the phone: a straight line + distance + arrow. Nothing is sent anywhere.
  function navigateTo(id: string) {
    setGpsOn(true);
    setTargetId(id);
    if (view !== 'map') onViewChange('map');
  }

  function goToNext() {
    const h = me ? pickNextHouse(me, houses, visited, targetId ?? undefined) : null;
    setTargetId(h?.id ?? null);
  }

  return (
    <div className="kid">
      <div className="kid-top">
        <ProgressBar visited={visitedCount} total={houses.length} />
        <div className="kid-controls">
          <div className="view-toggle" role="group" aria-label="תצוגה">
            <button type="button" aria-pressed={view === 'map'} onClick={() => onViewChange('map')}>
              מפה
            </button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => onViewChange('table')}>
              טבלה
            </button>
          </div>
          {view === 'map' && (
            <button
              type="button"
              className="theme-toggle"
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'מעבר למפה בהירה' : 'מעבר למפה כהה'}
              title={theme === 'dark' ? 'מפה בהירה' : 'מפה כהה'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}
        </div>
        {!gpsOn ? (
          <button type="button" className="btn primary" onClick={() => setGpsOn(true)}>
            הראו איפה אני
          </button>
        ) : (
          !target && (
            <div className="gps-row">
              {GEO_MESSAGES[geo.status] && <span className="hint">{GEO_MESSAGES[geo.status]}</span>}
              {me && next && (
                <button type="button" className="btn primary next-btn" onClick={() => setTargetId(next.id)}>
                  לבית הבא 🧭 ({formatDistance(distanceMeters(me, next))})
                </button>
              )}
            </div>
          )
        )}
        {target && (
          <NavBar
            target={target}
            position={me}
            visited={visited.has(target.id)}
            onStop={() => setTargetId(null)}
            onMarkVisited={() => onToggle(target.id)}
            onNext={goToNext}
          />
        )}
      </div>

      {view === 'table' ? (
        <HouseTable houses={houses} visited={visited} position={me} onToggle={onToggle} onNavigate={navigateTo} />
      ) : (
        <MapContainer center={[center.lat, center.lng]} zoom={16} className={`kid-map map-${theme}`}>
          <OsmTiles />
          <AutoResize />
          <FitHouses houses={houses} />
          <CenterOnMe position={me} />
          <FitRoute from={me} to={target} />
          {groups.map((g) => {
            const remaining = g.houses.filter((h) => !visited.has(h.id)).length;
            const available = g.houses.filter((h) => !h.out_of_candy).length;
            return (
              <Marker
                key={g.key}
                position={[g.lat, g.lng]}
                icon={groupIcon({ remaining, total: g.houses.length, available })}
              >
                <Popup>
                  <div className="popup">
                    {g.houses.map((h) => {
                      const done = visited.has(h.id);
                      return (
                        <div key={h.id} className={`popup-house ${done ? 'is-done' : ''}`}>
                          <strong>{formatAddress(h)}</strong>
                          {h.out_of_candy && <span className="out-label">נגמרו הממתקים 😢</span>}
                          {h.notes && <p>{h.notes}</p>}
                          <div className="popup-actions">
                            <button
                              type="button"
                              className={`btn ${done ? 'secondary' : 'primary'}`}
                              onClick={() => onToggle(h.id)}
                            >
                              {done ? 'בטלו סימון' : 'היינו כאן!'}
                            </button>
                            {!done && !h.out_of_candy && (
                              <button type="button" className="btn secondary" onClick={() => navigateTo(h.id)}>
                                נווטו לכאן 🧭
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {target && (
            <>
              <Marker position={[target.lat, target.lng]} icon={targetIcon} interactive={false} />
              {me && (
                <Polyline
                  positions={[
                    [me.lat, me.lng],
                    [target.lat, target.lng],
                  ]}
                  pathOptions={{ color: '#ff7a1a', weight: 4, dashArray: '8 10', opacity: 0.9 }}
                />
              )}
            </>
          )}
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
