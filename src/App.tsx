import { useCallback, useEffect, useState } from 'react';
import { KidMap } from './components/KidMap';
import { AddHouseForm } from './components/AddHouseForm';
import { HouseList } from './components/HouseList';
import { supabase, supabaseConfigured } from './lib/supabase';
import { addHouse, fetchHouses, removeHouse } from './lib/houses';
import { geocodeAddress, reverseGeocode } from './lib/geocode';
import { locateOnce } from './lib/locate';
import { loadView, loadVisited, saveView, saveVisited, toggleVisited, type View } from './lib/progress';
import type { House } from './lib/types';

type Tab = 'map' | 'add' | 'list';

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
  const [view, setView] = useState<View>(() => loadView(storage));

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

  async function handleRemove(id: string, password: string) {
    await removeHouse(supabase, id, password);
    refresh();
  }

  function changeView(next: View) {
    setView(next);
    saveView(storage, next);
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
          <button role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>
            רשימת הבתים
          </button>
        </nav>
      </header>

      {!supabaseConfigured && <p className="error banner">חסרות הגדרות Supabase (VITE_SUPABASE_URL).</p>}
      {loadError && <p className="error banner">לא הצלחנו לטעון את הבתים. בודקים שוב בעוד דקה.</p>}

      <main className="main">
        {tab === 'map' && (
          <KidMap
            houses={houses}
            visited={visited}
            onToggle={onToggle}
            onAutoVisit={onAutoVisit}
            view={view}
            onViewChange={changeView}
          />
        )}
        {tab === 'add' && (
          <AddHouseForm
            submit={(h, password) => addHouse(supabase, h, password)}
            geocode={(q) => geocodeAddress(q)}
            reverseGeocode={(p) => reverseGeocode(p)}
            locate={locateOnce}
            onAdded={refresh}
          />
        )}
        {tab === 'list' && (
          <HouseList houses={houses} onRemove={handleRemove} />
        )}
      </main>
    </div>
  );
}
