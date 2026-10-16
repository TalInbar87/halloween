import { distanceMeters } from '../lib/geo';
import { formatAddress } from '../lib/houseList';
import { ARRIVED_M, bearingDegrees, formatDistance } from '../lib/nav';
import type { House, LatLng } from '../lib/types';

interface Props {
  target: House;
  position: LatLng | null;
  visited: boolean;
  onStop: () => void;
  onMarkVisited: () => void;
  onNext: () => void;
}

/** "Walk to this house": distance + an arrow pointing the way on the (north-up) map. */
export function NavBar({ target, position, visited, onStop, onMarkVisited, onNext }: Props) {
  const meters = position ? distanceMeters(position, target) : null;
  const arrived = meters !== null && meters <= ARRIVED_M;
  const bearing = position ? Math.round(bearingDegrees(position, target)) : 0;

  return (
    <div className={`navbar ${arrived ? 'arrived' : ''}`}>
      <div className="navbar-info" role="status" aria-live="polite">
        {meters === null ? (
          <span className="navbar-msg">מחפשים את המיקום שלכם...</span>
        ) : arrived ? (
          <span className="navbar-msg">הגעתם! 🎉</span>
        ) : (
          <>
            <span className="navbar-arrow" data-testid="nav-arrow" style={{ transform: `rotate(${bearing}deg)` }}>
              ↑
            </span>
            <span className="navbar-distance">{formatDistance(meters)}</span>
          </>
        )}
        <span className="navbar-target">{formatAddress(target)}</span>
      </div>

      <div className="navbar-actions">
        {arrived && !visited && (
          <button type="button" className="btn primary" onClick={onMarkVisited}>
            היינו כאן!
          </button>
        )}
        {arrived && visited && (
          <button type="button" className="btn primary" onClick={onNext}>
            לבית הבא
          </button>
        )}
        <button type="button" className="navbar-stop" onClick={onStop} aria-label="הפסקת ניווט" title="הפסקת ניווט">
          ✕
        </button>
      </div>
    </div>
  );
}
