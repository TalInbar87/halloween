import { useId, useState, type FormEvent } from 'react';
import { formatAddress, searchHouses } from '../lib/houseList';
import { friendlyError } from '../lib/houses';
import { PIN_PATTERN } from '../lib/validation';
import type { House } from '../lib/types';

interface Props {
  houses: House[];
  /** Houses added from this device → removal token. */
  owned: Record<string, string>;
  onRemoveOwned: (id: string) => Promise<void>;
  onRemoveWithPin: (id: string, pin: string) => Promise<boolean>;
}

function RemoveWithCode({ house, onRemove }: { house: House; onRemove: Props['onRemoveWithPin'] }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  if (!open) {
    return (
      <button type="button" className="btn danger" onClick={() => setOpen(true)}>
        זה הבית שלי, הסירו
      </button>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!PIN_PATTERN.test(code)) {
      setError('נא להזין קוד של 4 ספרות');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const removed = await onRemove(house.id, code);
      if (!removed) setError('קוד שגוי');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="code-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId}>קוד הסרה</label>
      <input
        id={inputId}
        className="code-input"
        value={code}
        maxLength={4}
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
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

export function HouseList({ houses, owned, onRemoveOwned, onRemoveWithPin }: Props) {
  const [query, setQuery] = useState('');
  const [removedMsg, setRemovedMsg] = useState<string | null>(null);
  const [ownedError, setOwnedError] = useState<string | null>(null);
  const listId = useId();
  const results = searchHouses(houses, query);

  async function removeWithPin(id: string, pin: string) {
    const removed = await onRemoveWithPin(id, pin);
    if (removed) {
      const h = houses.find((x) => x.id === id);
      setRemovedMsg(`${h ? formatAddress(h) : 'הבית'} הוסר מהמפה.`);
      setQuery('');
    }
    return removed;
  }

  async function removeOwned(id: string) {
    const h = houses.find((x) => x.id === id);
    setOwnedError(null);
    try {
      await onRemoveOwned(id);
      setRemovedMsg(`${h ? formatAddress(h) : 'הבית'} הוסר מהמפה.`);
      setQuery('');
    } catch (err) {
      setOwnedError(friendlyError(err));
    }
  }

  return (
    <div className="card">
      <h2>רשימת הבתים</h2>
      <p className="hint">נגמרו הממתקים או שלא תרצו ביקורים? חפשו את הכתובת והסירו אותה מהמפה.</p>

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
      {ownedError && (
        <p className="error" role="alert">
          {ownedError}
        </p>
      )}

      {query.trim() && results.length === 0 && <p className="hint">לא נמצאה כתובת מתאימה.</p>}

      <ul id={listId} className="results" role="listbox" aria-label="תוצאות חיפוש">
        {results.map((h) => (
          <li key={h.id} role="option" aria-selected={false}>
            <span className="result-address">{formatAddress(h)}</span>
            {owned[h.id] ? (
              <button type="button" className="btn danger" onClick={() => removeOwned(h.id)}>
                הסירו מהמפה
              </button>
            ) : (
              <RemoveWithCode house={h} onRemove={removeWithPin} />
            )}
          </li>
        ))}
      </ul>

      <p className="hint small">{houses.length} בתים במפה</p>
    </div>
  );
}
