import { useState } from 'react';
import { distanceMeters } from '../lib/geo';
import { formatAddress, searchHouses, sortByAddress } from '../lib/houseList';
import type { House, LatLng } from '../lib/types';

interface Props {
  houses: House[];
  visited: ReadonlySet<string>;
  /** Kid's GPS position, if on: shows meters. */
  position: LatLng | null;
  onToggle: (id: string) => void;
}

export function HouseTable({ houses, visited, position, onToggle }: Props) {
  const [query, setQuery] = useState('');
  if (houses.length === 0) return <p className="hint table-empty">עדיין אין בתים במפה</p>;

  const shown = query.trim() ? searchHouses(houses, query, houses.length) : houses;
  // Address order (street, number, floor, apartment); houses already visited drop to the
  // bottom (sort is stable, so they keep the same order there).
  const rows = sortByAddress(shown)
    .map((h) => ({ house: h, label: formatAddress(h), meters: position ? distanceMeters(position, h) : null }))
    .sort((a, b) => Number(visited.has(a.house.id)) - Number(visited.has(b.house.id)));

  return (
    <div className="table-wrap">
      <input
        type="search"
        className="search-input table-filter"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="סננו לפי כתובת, למשל: הירדן 12"
        aria-label="חיפוש לפי כתובת"
      />
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
      {rows.length === 0 && <p className="hint table-empty">אין בתים שמתאימים לחיפוש</p>}
    </div>
  );
}
