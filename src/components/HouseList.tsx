import { useId, useState } from 'react';
import { formatAddress, searchHouses, sortByAddress } from '../lib/houseList';
import { friendlyError } from '../lib/houses';
import type { House } from '../lib/types';

interface Props {
  houses: House[];
  /** Admin panel is already unlocked; rejects with `rate_limited`, … */
  onRemove: (id: string) => Promise<void>;
  onEdit: (house: House) => void;
  onSetOutOfCandy: (id: string, out: boolean) => Promise<void>;
}

function OutOfCandyButton({ house, onSet }: { house: House; onSet: Props['onSetOutOfCandy'] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await onSet(house.id, !house.out_of_candy);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn secondary" onClick={toggle} disabled={busy}>
        {house.out_of_candy ? 'יש שוב ממתקים' : 'נגמרו הממתקים'}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function RemoveButton({ house, onRemove }: { house: House; onRemove: Props['onRemove'] }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button type="button" className="btn danger" onClick={() => setConfirming(true)}>
        הסירו מהמפה
      </button>
    );
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onRemove(house.id);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <div className="code-form">
      <span>להסיר את הבית?</span>
      <button type="button" className="btn danger" onClick={confirm} disabled={busy}>
        כן, הסירו
      </button>
      <button type="button" className="btn secondary" onClick={() => setConfirming(false)} disabled={busy}>
        ביטול
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function HouseList({ houses, onRemove, onEdit, onSetOutOfCandy }: Props) {
  const [query, setQuery] = useState('');
  const [removedMsg, setRemovedMsg] = useState<string | null>(null);
  const listId = useId();
  // Everything is listed; the search box only narrows it down.
  const sorted = sortByAddress(houses);
  const results = query.trim() ? searchHouses(sorted, query, Infinity) : sorted;

  async function remove(id: string) {
    const h = houses.find((x) => x.id === id);
    await onRemove(id);
    setRemovedMsg(`${h ? formatAddress(h) : 'הבית'} הוסר מהמפה.`);
    setQuery('');
  }

  return (
    <div className="card">
      <h3>הסרה ועריכה</h3>
      <p className="hint">חפשו את הכתובת כדי לדייק אותה, או להסיר אותה כשנגמרו הממתקים.</p>

      <label htmlFor="house-search" className="visually-hidden">
        חפשו כתובת
      </label>
      <input
        id="house-search"
        role="combobox"
        aria-expanded={query.trim() !== ''}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className="search-input"
        placeholder="סננו לפי כתובת, למשל: הירדן 12"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setRemovedMsg(null);
        }}
      />

      {removedMsg && <p className="success-msg">{removedMsg}</p>}

      {query.trim() && results.length === 0 && <p className="hint">לא נמצאה כתובת מתאימה.</p>}

      <ul id={listId} className="results" role="listbox" aria-label="תוצאות חיפוש">
        {results.map((h) => (
          <li key={h.id} role="option" aria-selected={false}>
            <span className="result-address">{formatAddress(h)}</span>
            {h.out_of_candy && <span className="out-label">נגמרו הממתקים 😢</span>}
            <div className="result-actions">
              <OutOfCandyButton house={h} onSet={onSetOutOfCandy} />
              <button type="button" className="btn secondary" onClick={() => onEdit(h)}>
                עריכה
              </button>
              <RemoveButton house={h} onRemove={remove} />
            </div>
          </li>
        ))}
      </ul>

      <p className="hint small">{houses.length} בתים במפה</p>
    </div>
  );
}
