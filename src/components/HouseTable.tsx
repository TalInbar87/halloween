import { useState } from 'react';
import { distanceMeters } from '../lib/geo';
import { formatAddress, sortByAddress } from '../lib/houseList';
import type { House, LatLng } from '../lib/types';

interface Props {
  houses: House[];
  visited: ReadonlySet<string>;
  /** Kid's GPS position, if on: shows meters and allows sorting by distance. */
  position: LatLng | null;
  onToggle: (id: string) => void;
  /** Turns GPS on when the kid picks distance sorting without it. */
  onLocate: () => void;
}

type SortBy = 'address' | 'distance';

const SORT_LABELS: Record<SortBy, string> = { address: 'כתובת', distance: 'הכי קרוב אליי' };

export function HouseTable({ houses, visited, position, onToggle, onLocate }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>('address');
  if (houses.length === 0) return <p className="hint table-empty">עדיין אין בתים במפה</p>;

  const choose = (o: SortBy) => {
    setSortBy(o);
    if (o === 'distance' && !position) onLocate();
  };

  // Address order (street, number, floor, apartment); by distance once GPS has a fix.
  const rows = sortByAddress(houses).map((h) => ({
    house: h,
    label: formatAddress(h),
    meters: position ? distanceMeters(position, h) : null,
  }));
  if (sortBy === 'distance' && position) rows.sort((a, b) => a.meters! - b.meters!);
  // Houses already visited drop to the bottom (sort is stable, so they keep the same order there).
  rows.sort((a, b) => Number(visited.has(a.house.id)) - Number(visited.has(b.house.id)));

  return (
    <div className="table-wrap">
      <div className="table-sort">
        <span className="hint">מיון לפי</span>
        <div className="view-toggle" role="group" aria-label="מיון">
          {(['address', 'distance'] as const).map((o) => (
            <button key={o} type="button" aria-pressed={sortBy === o} onClick={() => choose(o)}>
              {SORT_LABELS[o]}
            </button>
          ))}
        </div>
      </div>
      <table className="house-table">
        <thead>
          <tr>
            <th scope="col">כתובת</th>
            {position && <th scope="col">מרחק</th>}
            <th scope="col">היינו כאן</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ house, label, meters }) => {
            const done = visited.has(house.id);
            return (
              <tr key={house.id} className={[done && 'is-done', house.out_of_candy && 'is-out'].filter(Boolean).join(' ') || undefined}>
                <td>
                  <span className="row-address">{label}</span>
                  {house.out_of_candy && <span className="out-label">נגמרו הממתקים 😢</span>}
                  {house.notes && <span className="row-notes">{house.notes}</span>}
                </td>
                {position && <td className="row-distance">{meters !== null && `${Math.round(meters)} מ׳`}</td>}
                <td className="row-check">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => onToggle(house.id)}
                    aria-label={`היינו ב${label}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
