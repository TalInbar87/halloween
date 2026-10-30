import { useState } from 'react';
import { distanceMeters } from '../lib/geo';
import { formatAddress, sortByAddress, sortByFloor } from '../lib/houseList';
import type { House, LatLng } from '../lib/types';

interface Props {
  houses: House[];
  visited: ReadonlySet<string>;
  /** Kid's GPS position, if on: shows meters and allows sorting by distance. */
  position: LatLng | null;
  onToggle: (id: string) => void;
}

type SortBy = 'address' | 'floor' | 'distance';

const SORT_LABELS: Record<SortBy, string> = { address: 'כתובת', floor: 'קומה ודירה', distance: 'מרחק' };

export function HouseTable({ houses, visited, position, onToggle }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>('address');
  if (houses.length === 0) return <p className="hint table-empty">עדיין אין בתים במפה</p>;

  // Distance needs GPS; without it fall back to address.
  const active: SortBy = sortBy === 'distance' && !position ? 'address' : sortBy;
  const options: SortBy[] = position ? ['address', 'floor', 'distance'] : ['address', 'floor'];

  const sorted = active === 'floor' ? sortByFloor(houses) : sortByAddress(houses);
  // Order never depends on `visited`, so ticking a box doesn't move the row away
  // from under the kid's finger.
  const rows = sorted.map((h) => ({ house: h, label: formatAddress(h), meters: position ? distanceMeters(position, h) : null }));
  if (active === 'distance') rows.sort((a, b) => a.meters! - b.meters!);

  return (
    <div className="table-wrap">
      <div className="table-sort">
        <span className="hint">מיון לפי</span>
        <div className="view-toggle" role="group" aria-label="מיון">
          {options.map((o) => (
            <button key={o} type="button" aria-pressed={active === o} onClick={() => setSortBy(o)}>
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
