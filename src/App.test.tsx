import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach } from 'vitest';

const api = vi.hoisted(() => ({
  fetchHouses: vi.fn(),
  addHouse: vi.fn(),
  removeHouse: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('./lib/supabase', () => ({ supabase: {}, supabaseConfigured: true }));
vi.mock('./lib/houses', async (orig) => ({ ...(await orig<typeof import('./lib/houses')>()), ...api }));
// Leaflet needs a real browser; the map itself is covered elsewhere.
vi.mock('./components/KidMap', () => ({ KidMap: () => <div data-testid="kid-map" /> }));
vi.mock('./components/AddHouseForm', () => ({
  AddHouseForm: (p: { submit: (h: unknown) => Promise<unknown> }) => (
    <button
      type="button"
      onClick={() =>
        p.submit({ address: 'הירדן 12', apartment: null, floor: null, notes: null, lat: 32.05, lng: 34.858 }).catch(
          () => undefined,
        )
      }
    >
      stub-add
    </button>
  ),
}));

import App from './App';

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchHouses.mockResolvedValue([]);
  api.verifyPassword.mockResolvedValue(undefined);
  api.addHouse.mockResolvedValue('h1');
});

async function unlock(user: ReturnType<typeof userEvent.setup>, password = 'secret') {
  await user.click(screen.getByRole('button', { name: 'ניהול' }));
  await user.type(screen.getByLabelText('סיסמת מבוגרים'), password);
  await user.click(screen.getByRole('button', { name: 'כניסה' }));
}

describe('App', () => {
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
    expect(api.addHouse).toHaveBeenCalledWith({}, expect.objectContaining({ address: 'הירדן 12' }), 'secret');
  });

  it('stays locked after a wrong password', async () => {
    api.verifyPassword.mockRejectedValue(new Error('wrong_password'));
    const user = userEvent.setup();
    render(<App />);
    await unlock(user, 'nope');
    expect(await screen.findByRole('alert')).toHaveTextContent('סיסמה שגויה');
    expect(screen.queryByRole('heading', { name: 'ניהול בתים' })).not.toBeInTheDocument();
  });

  it('remembers the unlock until "lock" is pressed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await unlock(user);
    await user.click(await screen.findByRole('button', { name: 'חזרה למפה' }));
    expect(screen.getByTestId('kid-map')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ניהול' }));
    expect(screen.getByRole('heading', { name: 'ניהול בתים' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'נעילה' }));
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
});
