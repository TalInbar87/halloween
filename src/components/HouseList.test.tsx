import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { HouseList } from './HouseList';
import type { House } from '../lib/types';

const house = (id: string, address: string, over: Partial<House> = {}): House => ({
  id,
  address,
  apartment: null,
  floor: null,
  lat: 32.05,
  lng: 34.858,
  notes: null,
  created_at: '2026-10-12T00:00:00Z',
  ...over,
});

const houses = [
  house('a', 'הירדן 12, קרית אונו', { apartment: '4', floor: '2' }),
  house('b', 'צה"ל 30, קרית אונו'),
];

function setup(over: Partial<Parameters<typeof HouseList>[0]> = {}) {
  const props = { houses, onRemove: vi.fn().mockResolvedValue(undefined), ...over };
  render(<HouseList {...props} />);
  return { ...props, user: userEvent.setup() };
}

const search = () => screen.getByRole('combobox', { name: /חפשו כתובת/ });

async function removeVia(user: ReturnType<typeof userEvent.setup>, query: string, password: string) {
  await user.type(search(), query);
  await user.click(screen.getByRole('button', { name: 'הסירו מהמפה' }));
  if (password) await user.type(screen.getByLabelText('סיסמת מבוגרים'), password);
  await user.click(screen.getByRole('button', { name: 'אישור הסרה' }));
}

describe('HouseList', () => {
  it('shows suggestions while typing', async () => {
    const { user } = setup();
    await user.type(search(), 'ירד');
    expect(screen.getByText('הירדן 12, קרית אונו · דירה 4, קומה 2')).toBeInTheDocument();
    expect(screen.queryByText(/צה"ל/)).not.toBeInTheDocument();
  });

  it('says when nothing matches', async () => {
    const { user } = setup();
    await user.type(search(), 'רחוב אחר');
    expect(screen.getByText(/לא נמצאה/)).toBeInTheDocument();
  });

  it('removes a house with the adults password', async () => {
    const { user, onRemove } = setup();
    await removeVia(user, 'צהל', 'secret');
    expect(onRemove).toHaveBeenCalledWith('b', 'secret');
    expect(await screen.findByText(/הוסר מהמפה/)).toBeInTheDocument();
  });

  it('asks for the password in a masked field', async () => {
    const { user } = setup();
    await user.type(search(), 'צהל');
    await user.click(screen.getByRole('button', { name: 'הסירו מהמפה' }));
    expect(screen.getByLabelText('סיסמת מבוגרים')).toHaveAttribute('type', 'password');
  });

  it('shows an error for a wrong password', async () => {
    const { user } = setup({ onRemove: vi.fn().mockRejectedValue(new Error('wrong_password')) });
    await removeVia(user, 'צהל', 'nope');
    expect(await screen.findByRole('alert')).toHaveTextContent('סיסמה שגויה');
  });

  it('shows a friendly error when removal is blocked', async () => {
    const { user } = setup({ onRemove: vi.fn().mockRejectedValue(new Error('rate_limited')) });
    await removeVia(user, 'צהל', 'secret');
    expect(await screen.findByRole('alert')).toHaveTextContent(/יותר מדי/);
  });

  it('does not send an empty password', async () => {
    const { user, onRemove } = setup();
    await removeVia(user, 'צהל', '');
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('נא להזין את סיסמת המבוגרים');
  });
});
