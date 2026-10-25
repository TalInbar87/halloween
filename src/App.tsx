import { useCallback, useEffect, useRef, useState } from 'react';
import { KidMap } from './components/KidMap';
import { AddHouseForm } from './components/AddHouseForm';
import { HouseList } from './components/HouseList';
import { PasswordPrompt } from './components/PasswordPrompt';
import { AdminPanel } from './components/AdminPanel';
import { Countdown } from './components/Countdown';
import { WelcomePopup } from './components/WelcomePopup';
import { AccessGate } from './components/AccessGate';
import { clearAccess, loadAccess, saveAccess } from './lib/access';
import { JokeToast } from './components/JokeToast';
import { JOKES, loadJokeBag, nextJoke, saveJokeBag } from './lib/jokes';
import { supabase, supabaseConfigured } from './lib/supabase';
import { addHouse, fetchHouses, removeHouse, setOutOfCandy, updateHouse, verifyPassword } from './lib/houses';
import { geocodeAddress, reverseGeocode } from './lib/geocode';
import { locateOnce } from './lib/locate';
import { loadView, loadVisited, saveView, saveVisited, toggleVisited, type View } from './lib/progress';
import { completedBuilding } from './lib/houseList';
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
  // Neighbourhood password: nothing is loaded or shown until the server accepts it.
  const [access, setAccess] = useState<string | null>(() => loadAccess(storage));
  const [accessNotice, setAccessNotice] = useState<string | undefined>(undefined);
  const [houses, setHouses] = useState<House[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [visited, setVisited] = useState(() => loadVisited(storage));
  const [editing, setEditing] = useState<House | null>(null);
  const [view, setView] = useState<View>(() => loadView(storage));

  const lockOut = useCallback(
    (notice?: string) => {
      clearAccess(storage);
      setAccess(null);
      setHouses([]);
      setAccessNotice(notice);
    },
    [storage],
  );

  const refresh = useCallback(async () => {
    if (!access) return;
    // Logged in for 5 hours: an open page also locks once they're up.
    if (!loadAccess(storage)) {
      lockOut('עברו 5 שעות. נא להזין שוב את סיסמת השכונה.');
      return;
    }
    try {
      setHouses(await fetchHouses(supabase, access));
      setLoadError(false);
    } catch (err) {
      if (err instanceof Error && err.message.includes('wrong_password')) {
        lockOut('הסיסמה התחלפה. בקשו את החדשה מהמארגנים.');
      } else {
        setLoadError(true);
      }
    }
  }, [access, lockOut, storage]);

  async function unlock(password: string) {
    const list = await fetchHouses(supabase, password); // rejects on a wrong password
    setHouses(list);
    saveAccess(storage, password);
    setAccessNotice(undefined);
    setAccess(password);
  }

  // New houses show up for kids already out on the street.
  useEffect(() => {
    if (!supabaseConfigured || !access) return;
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
  // Each "היינו כאן" pops a candy joke from a shuffle bag: every joke is seen once
  // before any repeats. The bag is kept on the phone so a refresh doesn't restart it.
  const [joke, setJoke] = useState<{ index: number; note?: string } | null>(null);
  const housesRef = useRef(houses);
  housesRef.current = houses;
  const visitedRef = useRef(visited);
  visitedRef.current = visited;

  const onToggle = useCallback((id: string) => {
    const marking = !visitedRef.current.has(id);
    setVisited((v) => toggleVisited(v, id));
    if (marking) {
      const { index, bag } = nextJoke(loadJokeBag(storage));
      saveJokeBag(storage, bag);
      const building = completedBuilding(housesRef.current, visitedRef.current, id);
      setJoke({ index, note: building ? `🏢 סיימתם את כל הבניין ב${building}! 🎉` : undefined });
    }
  }, [storage]);
  const dismissJoke = useCallback(() => setJoke(null), []);

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

  async function handleSetOutOfCandy(id: string, out: boolean) {
    await asAdmin((pw) => setOutOfCandy(supabase, id, out, pw));
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
          {access && !adminOpen && (
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
      {access && loadError && <p className="error banner">לא הצלחנו לטעון את הבתים. בודקים שוב בעוד דקה.</p>}

      <main className="main">
        {!access ? (
          <AccessGate onUnlock={unlock} notice={accessNotice} />
        ) : adminOpen && adminPassword ? (
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
            removeList={<HouseList
                houses={houses}
                onRemove={handleRemove}
                onEdit={setEditing}
                onSetOutOfCandy={handleSetOutOfCandy}
              />}
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

      {access && <WelcomePopup />}

      {joke !== null && <JokeToast joke={JOKES[joke.index]} note={joke.note} onDone={dismissJoke} />}

      {access && adminOpen && !adminPassword && (
        <PasswordPrompt
          verify={(pw) => verifyPassword(supabase, pw)}
          onUnlock={setAdminPassword}
          onCancel={() => setAdminOpen(false)}
        />
      )}
    </div>
  );
}
