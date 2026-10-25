import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach } from 'vitest';

const api = vi.hoisted(() => ({
  fetchHouses: vi.fn(),
  addHouse: vi.fn(),
  removeHouse: vi.fn(),
  verifyPassword: vi.fn(),
  updateHouse: vi.fn(),
}));

const fixtureHouse = {
  id: 'h9',
  address: 'נהר הירדן 23',
  street: 'נהר הירדן',
  house_number: '23',
  apartment: '20',
  floor: '5',
  building_code: null,
  out_of_candy: false,
  notes: null,
  lat: 32.0507,
  lng: 34.858,
  created_at: 'x',
};

vi.mock('./lib/supabase', () => ({ supabase: {}, supabaseConfigured: true }));
// Covered by their own tests; keep App tests focused and deterministic.
vi.mock('./components/WelcomePopup', () => ({ WelcomePopup: () => null }));
vi.mock('./components/Countdown', () => ({ Countdown: () => <div data-testid="countdown" /> }));
vi.mock('./components/Celebration', () => ({ Celebration: () => null }));
vi.mock('./lib/houses', async (orig) => ({ ...(await orig<typeof import('./lib/houses')>()), ...api }));
// Leaflet needs a real browser; the map itself is covered elsewhere.
vi.mock('./components/KidMap', () => ({
  KidMap: (p: { visited: Set<string>; onToggle: (id: string) => void } & Record<string, unknown>) => (
    <div data-testid="kid-map" data-props={Object.keys(p).sort().join(',')}>
      <span data-testid="visited">{[...p.visited].join(',')}</span>
      <button type="button" onClick={() => p.onToggle('h9')}>
        stub-toggle
      </button>
    </div>
  ),
}));
vi.mock('./components/AddHouseForm', () => ({
  AddHouseForm: (p: { submit: (h: unknown) => Promise<unknown>; initial?: { address: string } }) => (
    <div>
      {p.initial && <span data-testid="editing">{p.initial.address}</span>}
      <button
        type="button"
        onClick={() =>
          p
            .submit({
              street: 'נהר הירדן',
              house_number: '12',
              apartment: null,
              floor: null,
              building_code: null,
              notes: null,
              lat: 32.05,
              lng: 34.858,
            })
            .catch(() => undefined)
        }
      >
        stub-add
      </button>
    </div>
  ),
}));

import App from './App';
import { JOKES } from './lib/jokes';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('halloween.access.v1', JSON.stringify('ourstreet')); // already let in
  api.fetchHouses.mockResolvedValue([]);
  api.updateHouse.mockResolvedValue(undefined);
  api.verifyPassword.mockResolvedValue(undefined);
  api.addHouse.mockResolvedValue('h1');
});

async function unlock(user: ReturnType<typeof userEvent.setup>, password = 'secret') {
  await user.click(screen.getByRole('button', { name: 'ניהול' }));
  await user.type(screen.getByLabelText('סיסמת מבוגרים'), password);
  await user.click(screen.getByRole('button', { name: 'כניסה' }));
}

describe('App', () => {
  it('shows the new title with the countdown under it', () => {
    render(<App />);
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('מפת השכונה הכי טובה EVER!');
    expect(title.compareDocumentPosition(screen.getByTestId('countdown')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows one main screen: the kid view and a gear, no tabs', () => {
    render(<App />);
    expect(screen.getByTestId('kid-map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ניהול' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('asks for the password when the gear is pressed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'ניהול' }));
    expect(screen.getByRole('dialog', { name: 'כניסת מבוגרים' })).toBeInTheDocument();
  });

  it('opens the admin panel after the right password and adds with it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await unlock(user);
    expect(await screen.findByRole('heading', { name: 'ניהול בתים' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'stub-add' }));
    expect(api.addHouse).toHaveBeenCalledWith({}, expect.objectContaining({ street: 'נהר הירדן', house_number: '12' }), 'secret');
  });

  it('stays locked after a wrong password', async () => {
    api.verifyPassword.mockRejectedValue(new Error('wrong_password'));
    const user = userEvent.setup();
    render(<App />);
    await unlock(user, 'nope');
    expect(await screen.findByRole('alert')).toHaveTextContent('סיסמה שגויה');
    expect(screen.queryByRole('heading', { name: 'ניהול בתים' })).not.toBeInTheDocument();
  });

  it('remembers the unlock until "log out" is pressed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await unlock(user);
    await user.click(await screen.findByRole('button', { name: 'חזרה למפה' }));
    expect(screen.getByTestId('kid-map')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ניהול' }));
    expect(screen.getByRole('heading', { name: 'ניהול בתים' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'התנתק' }));
    await user.click(screen.getByRole('button', { name: 'ניהול' }));
    expect(screen.getByRole('dialog', { name: 'כניסת מבוגרים' })).toBeInTheDocument();
  });

  it('locks again if the password was changed meanwhile', async () => {
    api.addHouse.mockRejectedValue(new Error('wrong_password'));
    const user = userEvent.setup();
    render(<App />);
    await unlock(user);
    await user.click(await screen.findByRole('button', { name: 'stub-add' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'כניסת מבוגרים' })).toBeInTheDocument());
  });

  it('edits an existing house from the admin list', async () => {
    api.fetchHouses.mockResolvedValue([fixtureHouse]);
    const user = userEvent.setup();
    render(<App />);
    await unlock(user);
    await user.click(await screen.findByRole('button', { name: 'הסרה ועריכה' }));
    await user.type(screen.getByRole('combobox', { name: /חפשו כתובת/ }), 'נהר');
    await user.click(screen.getByRole('button', { name: 'עריכה' }));
    expect(screen.getByTestId('editing')).toHaveTextContent('נהר הירדן 23');
    await user.click(screen.getByRole('button', { name: 'stub-add' }));
    await waitFor(() =>
      expect(api.updateHouse).toHaveBeenCalledWith({}, 'h9', expect.objectContaining({ street: 'נהר הירדן', house_number: '12' }), 'secret'),
    );
  });

  it('marks and unmarks a house only by tapping', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'stub-toggle' }));
    expect(screen.getByTestId('visited')).toHaveTextContent('h9');
    await user.click(screen.getByRole('button', { name: 'stub-toggle' }));
    expect(screen.getByTestId('visited')).toHaveTextContent('');
  });

  it('gives the map no way to mark houses by itself (no automatic check-off)', () => {
    render(<App />);
    expect(screen.getByTestId('kid-map').dataset.props).not.toMatch(/auto/i);
  });

  it('pops a random joke when a house is marked, not when unmarked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'stub-toggle' }));
    const toast = screen.getByRole('status');
    expect(JOKES.some((j) => toast.textContent?.includes(j.text))).toBe(true);
    await user.click(document.querySelector('.joke-stage')!); // tap away
    await user.click(screen.getByRole('button', { name: 'stub-toggle' })); // unmark
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows six different jokes for six marks (and remembers the round across a refresh)', async () => {
    api.fetchHouses.mockResolvedValue([]);
    const user = userEvent.setup();
    const seen: string[] = [];
    const { unmount } = render(<App />);
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'stub-toggle' })); // mark
      seen.push(screen.getByRole('status').textContent ?? '');
      await user.click(screen.getByRole('button', { name: 'stub-toggle' })); // unmark
    }
    unmount();
    render(<App />); // page refresh
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'stub-toggle' }));
      seen.push(screen.getByRole('status').textContent ?? '');
      await user.click(screen.getByRole('button', { name: 'stub-toggle' }));
    }
    expect(new Set(seen).size).toBe(6);
  });

  it('adds a "whole building done" note when the last apartment of an address is marked', async () => {
    api.fetchHouses.mockResolvedValue([fixtureHouse, { ...fixtureHouse, id: 'h10', apartment: '21' }]);
    localStorage.setItem('halloween.visited.v1', JSON.stringify(['h10']));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByTestId('kid-map');
    await waitFor(() => expect(api.fetchHouses).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'stub-toggle' })); // marks h9, the last one
    expect(screen.getByRole('status')).toHaveTextContent('סיימתם את כל הבניין בנהר הירדן 23');
  });

  describe('neighbourhood password', () => {
    it('shows only the entry screen to a phone that has not entered it — no map, no houses', () => {
      localStorage.removeItem('halloween.access.v1');
      render(<App />);
      expect(screen.getByLabelText('סיסמת השכונה')).toBeInTheDocument();
      expect(screen.queryByTestId('kid-map')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'ניהול' })).not.toBeInTheDocument();
      expect(api.fetchHouses).not.toHaveBeenCalled();
    });

    it('lets the kid in with the right password and remembers it on the phone', async () => {
      localStorage.removeItem('halloween.access.v1');
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText('סיסמת השכונה'), 'ourstreet{Enter}');
      expect(await screen.findByTestId('kid-map')).toBeInTheDocument();
      expect(api.fetchHouses).toHaveBeenCalledWith({}, 'ourstreet');
      expect(JSON.parse(localStorage.getItem('halloween.access.v1')!)).toBe('ourstreet');
    });

    it('keeps the map closed after a wrong password', async () => {
      localStorage.removeItem('halloween.access.v1');
      api.fetchHouses.mockRejectedValue(new Error('wrong_password'));
      const user = userEvent.setup();
      render(<App />);
      await user.type(screen.getByLabelText('סיסמת השכונה'), 'nope{Enter}');
      expect(await screen.findByRole('alert')).toHaveTextContent('סיסמה שגויה');
      expect(screen.queryByTestId('kid-map')).not.toBeInTheDocument();
      expect(localStorage.getItem('halloween.access.v1')).toBeNull();
    });

    it('asks again, with a note, when the remembered password was changed', async () => {
      api.fetchHouses.mockRejectedValue(new Error('wrong_password'));
      render(<App />);
      expect(await screen.findByText(/הסיסמה התחלפה/)).toBeInTheDocument();
      expect(screen.getByLabelText('סיסמת השכונה')).toBeInTheDocument();
      expect(screen.queryByTestId('kid-map')).not.toBeInTheDocument();
      expect(localStorage.getItem('halloween.access.v1')).toBeNull();
    });

    it('uses the remembered password for loading houses', async () => {
      render(<App />);
      await waitFor(() => expect(api.fetchHouses).toHaveBeenCalledWith({}, 'ourstreet'));
    });
  });
});
