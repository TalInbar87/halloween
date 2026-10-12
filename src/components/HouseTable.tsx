import { distanceMeters } from '../lib/geo';
import { formatAddress } from '../lib/houseList';
import type { House, LatLng } from '../lib/types';

interface Props {
  houses: House[];
  visited: ReadonlySet<string>;
  /** Kid's GPS position, if on: sorts by distance and shows meters. */
  position: LatLng | null;
  onToggle: (id: string) => void;
}

export function HouseTable({ houses, visited, position, onToggle }: Props) {
  if (houses.length === 0) return <p className="hint table-empty">עדיין אין בתים במפה</p>;

  const rows = houses
    .map((h) => ({ house: h, label: formatAddress(h), meters: position ? distanceMeters(position, h) : null }))
    .sort((a, b) => {
      const doneDiff = Number(visited.has(a.house.id)) - Number(visited.has(b.house.id));
      if (doneDiff !== 0) return doneDiff;
      if (a.meters !== null && b.meters !== null) return a.meters - b.meters;
      return a.label.localeCompare(b.label, 'he');
    });

  return (
    <div className="table-wrap">
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
              <tr key={house.id} className={done ? 'is-done' : undefined}>
                <td>
                  <span className="row-address">{label}</span>
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
