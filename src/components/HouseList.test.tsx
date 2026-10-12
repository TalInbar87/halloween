import { render, screen, waitFor } from '@testing-library/react';
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
  const props = {
    houses,
    owned: {} as Record<string, string>,
    onRemoveOwned: vi.fn().mockResolvedValue(undefined),
    onRemoveWithPin: vi.fn().mockResolvedValue(true),
    ...over,
  };
  render(<HouseList {...props} />);
  return { ...props, user: userEvent.setup() };
}

const search = () => screen.getByRole('combobox', { name: /חפשו כתובת/ });

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

  it('removes a house added from this device without a code', async () => {
    const { user, onRemoveOwned, onRemoveWithPin } = setup({ owned: { a: 'tok' } });
    await user.type(search(), 'הירדן');
    await user.click(screen.getByRole('button', { name: 'הסירו מהמפה' }));
    expect(onRemoveOwned).toHaveBeenCalledWith('a');
    expect(onRemoveWithPin).not.toHaveBeenCalled();
  });

  it('asks for the removal code for other houses', async () => {
    const { user, onRemoveWithPin } = setup();
    await user.type(search(), 'צהל');
    await user.click(screen.getByRole('button', { name: 'זה הבית שלי, הסירו' }));
    await user.type(screen.getByLabelText('קוד הסרה'), '1234');
    await user.click(screen.getByRole('button', { name: 'אישור הסרה' }));
    expect(onRemoveWithPin).toHaveBeenCalledWith('b', '1234');
    expect(await screen.findByText(/הוסר מהמפה/)).toBeInTheDocument();
  });

  it('shows an error for a wrong code', async () => {
    const { user } = setup({ onRemoveWithPin: vi.fn().mockResolvedValue(false) });
    await user.type(search(), 'צהל');
    await user.click(screen.getByRole('button', { name: 'זה הבית שלי, הסירו' }));
    await user.type(screen.getByLabelText('קוד הסרה'), '0000');
    await user.click(screen.getByRole('button', { name: 'אישור הסרה' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('קוד שגוי');
  });

  it('shows a friendly error when removal is blocked', async () => {
    const { user } = setup({ onRemoveWithPin: vi.fn().mockRejectedValue(new Error('rate_limited')) });
    await user.type(search(), 'צהל');
    await user.click(screen.getByRole('button', { name: 'זה הבית שלי, הסירו' }));
    await user.type(screen.getByLabelText('קוד הסרה'), '0000');
    await user.click(screen.getByRole('button', { name: 'אישור הסרה' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/יותר מדי/));
  });

  it('does not send a code that is not 4 digits', async () => {
    const { user, onRemoveWithPin } = setup();
    await user.type(search(), 'צהל');
    await user.click(screen.getByRole('button', { name: 'זה הבית שלי, הסירו' }));
    await user.type(screen.getByLabelText('קוד הסרה'), '12');
    await user.click(screen.getByRole('button', { name: 'אישור הסרה' }));
    expect(onRemoveWithPin).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('4 ספרות');
  });
});
