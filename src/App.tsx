import { useCallback, useEffect, useState } from 'react';
import { KidMap } from './components/KidMap';
import { AddHouseForm } from './components/AddHouseForm';
import { supabase, supabaseConfigured } from './lib/supabase';
import { addHouse, fetchHouses, friendlyError, removeHouse } from './lib/houses';
import { geocodeAddress, reverseGeocode } from './lib/geocode';
import { locateOnce } from './lib/locate';
import {
  forgetOwnedHouse,
  loadOwnedHouses,
  loadVisited,
  saveOwnedHouse,
  saveVisited,
  toggleVisited,
} from './lib/progress';
import type { House } from './lib/types';

type Tab = 'map' | 'add' | 'mine';

const REFRESH_MS = 60_000;

const safeStorage = (): Storage => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined } as unknown as Storage;
  }
};

export default function App() {
  const storage = safeStorage();
  const [tab, setTab] = useState<Tab>('map');
  const [houses, setHouses] = useState<House[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [visited, setVisited] = useState(() => loadVisited(storage));
  const [owned, setOwned] = useState(() => loadOwnedHouses(storage));

  const refresh = useCallback(async () => {
    try {
      setHouses(await fetchHouses(supabase));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  // New houses show up for kids already out on the street.
  useEffect(() => {
    if (!supabaseConfigured) return;
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  useEffect(() => saveVisited(storage, visited), [storage, visited]);

  const onToggle = useCallback((id: string) => setVisited((v) => toggleVisited(v, id)), []);
  const onAutoVisit = useCallback((id: string) => setVisited((v) => (v.has(id) ? v : new Set(v).add(id))), []);

  const ownedHouses = houses.filter((h) => owned[h.id]);

  async function handleRemove(id: string) {
    if (!confirm('להסיר את הבית מהמפה?')) return;
    try {
      await removeHouse(supabase, id, owned[id]);
      forgetOwnedHouse(storage, id);
      setOwned(loadOwnedHouses(storage));
      refresh();
    } catch (err) {
      alert(friendlyError(err));
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>מפת הממתקים של השכונה</h1>
        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'map'} onClick={() => setTab('map')}>
            מפה
          </button>
          <button role="tab" aria-selected={tab === 'add'} onClick={() => setTab('add')}>
            הוסיפו בית
          </button>
          {ownedHouses.length > 0 && (
            <button role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')}>
              הבתים שלי
            </button>
          )}
        </nav>
      </header>

      {!supabaseConfigured && <p className="error banner">חסרות הגדרות Supabase (VITE_SUPABASE_URL).</p>}
      {loadError && <p className="error banner">לא הצלחנו לטעון את הבתים. בודקים שוב בעוד דקה.</p>}

      <main className="main">
        {tab === 'map' && <KidMap houses={houses} visited={visited} onToggle={onToggle} onAutoVisit={onAutoVisit} />}
        {tab === 'add' && (
          <AddHouseForm
            submit={(h) => addHouse(supabase, h)}
            geocode={(q) => geocodeAddress(q)}
            reverseGeocode={(p) => reverseGeocode(p)}
            locate={locateOnce}
            onAdded={({ id, deleteToken }) => {
              saveOwnedHouse(storage, id, deleteToken);
              setOwned(loadOwnedHouses(storage));
              refresh();
            }}
          />
        )}
        {tab === 'mine' && (
          <div className="card">
            <h2>הבתים שהוספתם מהמכשיר הזה</h2>
            <ul className="owned">
              {ownedHouses.map((h) => (
                <li key={h.id}>
                  <span>{h.address}</span>
                  <button type="button" className="btn danger" onClick={() => handleRemove(h.id)}>
                    הסירו
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
