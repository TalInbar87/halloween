import { useState, type ComponentType, type FormEvent } from 'react';
import { validateHouseInput, ADDRESS_MAX, NOTES_MAX, type HouseFormErrors } from '../lib/validation';
import { friendlyError } from '../lib/houses';
import type { GeocodeResult } from '../lib/geocode';
import type { LatLng, NewHouse } from '../lib/types';
import { MapPicker } from './MapPicker';

export interface PickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
}

interface Props {
  submit: (house: NewHouse) => Promise<{ id: string; deleteToken: string }>;
  geocode: (query: string) => Promise<GeocodeResult[]>;
  onAdded: (result: { id: string; deleteToken: string }) => void;
  Picker?: ComponentType<PickerProps>;
}

export function AddHouseForm({ submit, geocode, onAdded, Picker = MapPicker }: Props) {
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<HouseFormErrors>({});
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSearch() {
    setSearchMsg(null);
    setSearching(true);
    try {
      const [first] = await geocode(address);
      if (first) {
        setPin({ lat: first.lat, lng: first.lng });
        setSearchMsg('מצאנו! גררו את הסיכה בדיוק לבית שלכם.');
      } else {
        setSearchMsg('לא מצאנו את הכתובת. סמנו את הבית ישירות על המפה.');
      }
    } catch {
      setSearchMsg('החיפוש לא זמין כרגע. סמנו את הבית ישירות על המפה.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const result = validateHouseInput({ address, notes, lat: pin?.lat ?? null, lng: pin?.lng ?? null, consent });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSending(true);
    try {
      const added = await submit(result.value);
      onAdded(added);
      setSuccess(true);
    } catch (err) {
      setServerError(friendlyError(err));
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <div className="card success">
        <h2>הבית נוסף למפה!</h2>
        <p>הילדים כבר יכולים לראות אותו. אפשר להסיר אותו בכל רגע מהמכשיר הזה, בלשונית "הבתים שלי".</p>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setSuccess(false);
            setAddress('');
            setNotes('');
            setPin(null);
            setConsent(false);
            setSearchMsg(null);
          }}
        >
          הוספת בית נוסף
        </button>
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>מחלקים ממתקים? הוסיפו את הבית</h2>

      <label htmlFor="address">כתובת</label>
      <div className="row">
        <input
          id="address"
          value={address}
          maxLength={ADDRESS_MAX}
          autoComplete="street-address"
          placeholder="רחוב ומספר, עיר"
          onChange={(e) => setAddress(e.target.value)}
          aria-invalid={!!errors.address}
        />
        <button type="button" className="btn secondary" onClick={handleSearch} disabled={searching}>
          חפשו במפה
        </button>
      </div>
      {errors.address && <p className="error">{errors.address}</p>}
      {searchMsg && <p className="hint">{searchMsg}</p>}

      <p className="hint">לחצו על המפה או גררו את הסיכה כדי לסמן את הבית בדיוק.</p>
      <Picker value={pin} onChange={setPin} />
      {errors.location && <p className="error">{errors.location}</p>}

      <label htmlFor="notes">הערות (לא חובה)</label>
      <input
        id="notes"
        value={notes}
        maxLength={NOTES_MAX}
        placeholder="למשל: ממתקים בלי בוטנים, מחלקים עד 20:00"
        onChange={(e) => setNotes(e.target.value)}
      />
      {errors.notes && <p className="error">{errors.notes}</p>}

      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>מסכימים שהכתובת תוצג במפה ציבורית לילדי השכונה</span>
      </label>
      {errors.consent && <p className="error">{errors.consent}</p>}

      {serverError && (
        <p className="error" role="alert">
          {serverError}
        </p>
      )}

      <button type="submit" className="btn primary" disabled={sending}>
        הוסיפו לי את הבית
      </button>
    </form>
  );
}
