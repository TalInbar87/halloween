import { useState, type ComponentType, type FormEvent } from 'react';
import {
  validateHouseInput,
  HOUSE_NUMBER_MAX,
  STREET_MAX,
  BUILDING_CODE_MAX,
  NOTES_MAX,
  UNIT_MAX,
  type HouseFormErrors,
} from '../lib/validation';
import { friendlyError } from '../lib/houses';
import type { GeocodeResult } from '../lib/geocode';
import { splitAddress } from '../lib/houseList';
import type { House, LatLng, NewHouse } from '../lib/types';
import { MapPicker } from './MapPicker';

const CITY_NAME = 'קרית אונו';

export interface PickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
}

interface Props {
  submit: (house: NewHouse) => Promise<unknown>;
  geocode: (query: string) => Promise<GeocodeResult[]>;
  reverseGeocode: (point: LatLng) => Promise<{ street: string; houseNumber: string } | null>;
  locate: () => Promise<LatLng>;
  onAdded: () => void;
  /** Edit an existing house instead of adding a new one. */
  initial?: House;
  onCancel?: () => void;
  Picker?: ComponentType<PickerProps>;
}

export function AddHouseForm({
  submit,
  geocode,
  reverseGeocode,
  locate,
  onAdded,
  initial,
  onCancel,
  Picker = MapPicker,
}: Props) {
  const editing = Boolean(initial);
  // Older rows only have free-text `address`; split it so they can be edited too.
  const initialParts =
    initial && (initial.street ?? null) === null ? splitAddress(initial.address) : null;
  const [street, setStreet] = useState(initial?.street ?? initialParts?.street ?? '');
  const [houseNumber, setHouseNumber] = useState(initial?.house_number ?? initialParts?.houseNumber ?? '');
  const [apartment, setApartment] = useState(initial?.apartment ?? '');
  const [floor, setFloor] = useState(initial?.floor ?? '');
  const [buildingCode, setBuildingCode] = useState(initial?.building_code ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [pin, setPin] = useState<LatLng | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [consent, setConsent] = useState(editing);
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
      const [first] = await geocode(`${street.trim()} ${houseNumber.trim()}, ${CITY_NAME}`);
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

  async function handleLocate() {
    setSearchMsg(null);
    setSearching(true);
    let here: LatLng;
    try {
      here = await locate();
    } catch {
      setSearchMsg('לא הצלחנו לקבל מיקום. הקלידו כתובת או סמנו את הבית על המפה.');
      setSearching(false);
      return;
    }
    setPin(here);
    if (street.trim()) {
      setSearchMsg('סימנו את המיקום שלכם. גררו את הסיכה אם צריך.');
      setSearching(false);
      return;
    }
    try {
      const found = await reverseGeocode(here);
      if (found) {
        setStreet(found.street);
        setHouseNumber(found.houseNumber);
        setSearchMsg('מילאנו את הכתובת לפי המיקום. בדקו שהיא נכונה.');
      } else {
        setSearchMsg('סימנו את המיקום. הקלידו את הכתובת.');
      }
    } catch {
      setSearchMsg('סימנו את המיקום. הקלידו את הכתובת.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const result = validateHouseInput({
      street,
      houseNumber,
      apartment,
      floor,
      buildingCode,
      notes,
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
      consent,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSending(true);
    try {
      await submit(result.value);
      onAdded();
      if (!editing) setSuccess(true);
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
        <p>הילדים כבר יכולים לראות אותו.</p>
        <p>נגמרו הממתקים? ב"הסרה ועריכה" מחפשים את הכתובת ומסירים אותה.</p>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setSuccess(false);
            setStreet('');
            setHouseNumber('');
            setApartment('');
            setFloor('');
            setBuildingCode('');
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
      <h2>{editing ? 'עריכת בית' : 'מחלקים ממתקים? הוסיפו את הבית'}</h2>

      <div className="street-row">
        <div className="street-field">
          <label htmlFor="street">רחוב</label>
          <input
            id="street"
            value={street}
            maxLength={STREET_MAX}
            autoComplete="address-line1"
            placeholder="למשל: נהר הירדן"
            onChange={(e) => setStreet(e.target.value)}
            aria-invalid={!!errors.street}
          />
        </div>
        <div className="number-field">
          <label htmlFor="house-number">מספר</label>
          <input
            id="house-number"
            value={houseNumber}
            maxLength={HOUSE_NUMBER_MAX}
            inputMode="numeric"
            autoComplete="off"
            placeholder="27"
            onChange={(e) => setHouseNumber(e.target.value)}
            aria-invalid={!!errors.houseNumber}
          />
        </div>
      </div>
      <p className="city">
        עיר: <strong>{CITY_NAME}</strong>
      </p>
      <div className="address-actions">
        <button type="button" className="btn secondary" onClick={handleSearch} disabled={searching}>
          חפשו במפה
        </button>
        <span className="or">או</span>
        <button type="button" className="btn secondary" onClick={handleLocate} disabled={searching}>
          אני בבית עכשיו, השתמשו במיקום שלי
        </button>
      </div>
      {errors.street && <p className="error">{errors.street}</p>}
      {errors.houseNumber && <p className="error">{errors.houseNumber}</p>}
      {searchMsg && <p className="hint">{searchMsg}</p>}

      <div className="unit-row">
        <div>
          <label htmlFor="apartment">דירה</label>
          <input
            id="apartment"
            value={apartment}
            maxLength={UNIT_MAX}
            inputMode="numeric"
            placeholder="לא חובה"
            onChange={(e) => setApartment(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="floor">קומה</label>
          <input
            id="floor"
            value={floor}
            maxLength={UNIT_MAX}
            inputMode="numeric"
            placeholder="לא חובה"
            onChange={(e) => setFloor(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="building-code">קוד לבניין</label>
          <input
            id="building-code"
            value={buildingCode}
            maxLength={BUILDING_CODE_MAX}
            inputMode="text"
            autoComplete="off"
            placeholder="לא חובה"
            onChange={(e) => setBuildingCode(e.target.value)}
          />
        </div>
      </div>
      {(errors.apartment || errors.floor || errors.buildingCode) && (
        <p className="error">{errors.apartment ?? errors.floor ?? errors.buildingCode}</p>
      )}

      <label htmlFor="notes">הערות לכתובת (לא חובה)</label>
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

      <p className="hint">וודאו במפה שהכתובת מדוייקת, ניתן לדייק בעזרת הזזה של הבית למען דיוק מירבי</p>
      <Picker value={pin} onChange={setPin} />
      {errors.location && <p className="error">{errors.location}</p>}

      {serverError && (
        <p className="error" role="alert">
          {serverError}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={sending}>
          {editing ? 'שמירת שינויים' : 'הוסיפו לי את הבית'}
        </button>
        {editing && onCancel && (
          <button type="button" className="btn secondary" onClick={onCancel}>
            ביטול
          </button>
        )}
      </div>
    </form>
  );
}
