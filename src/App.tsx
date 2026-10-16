import { useCallback, useEffect, useState } from 'react';
import { KidMap } from './components/KidMap';
import { AddHouseForm } from './components/AddHouseForm';
import { HouseList } from './components/HouseList';
import { PasswordPrompt } from './components/PasswordPrompt';
import { AdminPanel } from './components/AdminPanel';
import { Countdown } from './components/Countdown';
import { WelcomePopup } from './components/WelcomePopup';
import { supabase, supabaseConfigured } from './lib/supabase';
import { addHouse, fetchHouses, removeHouse, updateHouse, verifyPassword } from './lib/houses';
import { geocodeAddress, reverseGeocode } from './lib/geocode';
import { locateOnce } from './lib/locate';
import { loadView, loadVisited, saveView, saveVisited, toggleVisited, type View } from './lib/progress';
import type { House, NewHouse } from './lib/types';

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
  // Adults password, kept in memory only after the server accepted it. Cleared on
  // "lock", reload, or if the server later rejects it (password was changed).
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [visited, setVisited] = useState(() => loadVisited(storage));
  const [editing, setEditing] = useState<House | null>(null);
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

  // Houses are marked only when the kid taps "היינו כאן" — never automatically by GPS.
  const onToggle = useCallback((id: string) => setVisited((v) => toggleVisited(v, id)), []);

  // Any call that finds the password no longer valid locks the panel again.
  async function asAdmin<T>(action: (password: string) => Promise<T>): Promise<T> {
    try {
      return await action(adminPassword ?? '');
    } catch (err) {
      if (err instanceof Error && err.message.includes('wrong_password')) setAdminPassword(null);
      throw err;
    }
  }

  const handleAdd = (house: NewHouse) => asAdmin((pw) => addHouse(supabase, house, pw));

  const handleUpdate = (id: string, house: NewHouse) => asAdmin((pw) => updateHouse(supabase, id, house, pw));

  async function handleRemove(id: string) {
    await asAdmin((pw) => removeHouse(supabase, id, pw));
    refresh();
  }

  function changeView(next: View) {
    setView(next);
    saveView(storage, next);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>
            מפת השכונה הכי טובה <span dir="ltr">EVER!</span>
          </h1>
          {!adminOpen && (
            <button type="button" className="gear" aria-label="ניהול" title="ניהול (למבוגרים)" onClick={() => setAdminOpen(true)}>
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94 7.07 7.07 0 0 0-.06-.94l2.03-1.58a.48.48 0 0 0 .12-.61l-1.92-3.32a.48.48 0 0 0-.59-.21l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54a7.03 7.03 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.59.21L2.71 8.87a.48.48 0 0 0 .12.61l2.03 1.58a7.07 7.07 0 0 0-.06.94c0 .32.02.63.06.94l-2.03 1.58a.48.48 0 0 0-.12.61l1.92 3.32c.12.21.37.3.59.21l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54a7.03 7.03 0 0 0 1.62-.94l2.39.96c.22.09.47 0 .59-.21l1.92-3.32a.48.48 0 0 0-.12-.61l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"
                />
              </svg>
            </button>
          )}
        </div>
        {!adminOpen && <Countdown />}
      </header>

      {!supabaseConfigured && <p className="error banner">חסרות הגדרות Supabase (VITE_SUPABASE_URL).</p>}
      {loadError && <p className="error banner">לא הצלחנו לטעון את הבתים. בודקים שוב בעוד דקה.</p>}

      <main className="main">
        {adminOpen && adminPassword ? (
          <AdminPanel
            onClose={() => {
              setEditing(null);
              setAdminOpen(false);
            }}
            onLock={() => {
              setEditing(null);
              setAdminPassword(null);
              setAdminOpen(false);
            }}
            editForm={
              editing && (
                <AddHouseForm
                  key={editing.id}
                  initial={editing}
                  submit={(h) => handleUpdate(editing.id, h)}
                  geocode={(q) => geocodeAddress(q)}
                  reverseGeocode={(p) => reverseGeocode(p)}
                  locate={locateOnce}
                  onAdded={() => {
                    setEditing(null);
                    refresh();
                  }}
                  onCancel={() => setEditing(null)}
                />
              )
            }
            addForm={
              <AddHouseForm
                submit={handleAdd}
                geocode={(q) => geocodeAddress(q)}
                reverseGeocode={(p) => reverseGeocode(p)}
                locate={locateOnce}
                onAdded={refresh}
              />
            }
            removeList={<HouseList houses={houses} onRemove={handleRemove} onEdit={setEditing} />}
          />
        ) : (
          <KidMap
            houses={houses}
            visited={visited}
            onToggle={onToggle}
            view={view}
            onViewChange={changeView}
          />
        )}
      </main>

      <WelcomePopup />

      {adminOpen && !adminPassword && (
        <PasswordPrompt
          verify={(pw) => verifyPassword(supabase, pw)}
          onUnlock={setAdminPassword}
          onCancel={() => setAdminOpen(false)}
        />
      )}
    </div>
  );
}
