import { useId, useState, type FormEvent } from 'react';
import { formatAddress, searchHouses } from '../lib/houseList';
import { friendlyError } from '../lib/houses';
import type { House } from '../lib/types';

interface Props {
  houses: House[];
  /** Rejects with `wrong_password`, `rate_limited`, … */
  onRemove: (id: string, password: string) => Promise<void>;
}

function RemoveWithPassword({ house, onRemove }: { house: House; onRemove: Props['onRemove'] }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  if (!open) {
    return (
      <button type="button" className="btn danger" onClick={() => setOpen(true)}>
        הסירו מהמפה
      </button>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      setError('נא להזין את סיסמת המבוגרים');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRemove(house.id, password);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <form className="code-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId}>סיסמת מבוגרים</label>
      <input
        id={inputId}
        type="password"
        value={password}
        autoComplete="off"
        autoFocus
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" className="btn danger" disabled={busy}>
        אישור הסרה
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function HouseList({ houses, onRemove }: Props) {
  const [query, setQuery] = useState('');
  const [removedMsg, setRemovedMsg] = useState<string | null>(null);
  const listId = useId();
  const results = searchHouses(houses, query);

  async function remove(id: string, password: string) {
    const h = houses.find((x) => x.id === id);
    await onRemove(id, password);
    setRemovedMsg(`${h ? formatAddress(h) : 'הבית'} הוסר מהמפה.`);
    setQuery('');
  }

  return (
    <div className="card">
      <h2>רשימת הבתים</h2>
      <p className="hint">נגמרו הממתקים או שלא תרצו ביקורים? חפשו את הכתובת והסירו אותה מהמפה (נדרשת סיסמת מבוגרים).</p>

      <label htmlFor="house-search" className="visually-hidden">
        חפשו כתובת
      </label>
      <input
        id="house-search"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className="search-input"
        placeholder="חפשו כתובת, למשל: הירדן 12"
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
            <RemoveWithPassword house={h} onRemove={remove} />
          </li>
        ))}
      </ul>

      <p className="hint small">{houses.length} בתים במפה</p>
    </div>
  );
}
