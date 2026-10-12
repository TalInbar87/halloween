import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { HouseTable } from './HouseTable';
import type { House } from '../lib/types';

const house = (id: string, address: string, lat: number, over: Partial<House> = {}): House => ({
  id,
  address,
  street: null,
  house_number: null,
  apartment: null,
  floor: null,
  building_code: null,
  lat,
  lng: 34.858,
  notes: null,
  created_at: '2026-10-12T00:00:00Z',
  ...over,
});

const houses = [
  house('far', 'צה"ל 30, קרית אונו', 32.06),
  house('near', 'הירדן 12, קרית אונו', 32.0501, { apartment: '4', floor: '2', notes: 'בלי בוטנים' }),
  house('mid', 'אלון 3, קרית אונו', 32.052),
];

const rowsText = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('HouseTable', () => {
  it('lists every house with its full address and notes', () => {
    render(<HouseTable houses={houses} visited={new Set()} position={null} onToggle={vi.fn()} />);
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('הירדן 12, קרית אונו · דירה 4, קומה 2')).toBeInTheDocument();
    expect(screen.getByText('בלי בוטנים')).toBeInTheDocument();
  });

  it('sorts alphabetically without GPS', () => {
    render(<HouseTable houses={houses} visited={new Set()} position={null} onToggle={vi.fn()} />);
    expect(rowsText()[0]).toContain('אלון');
  });

  it('sorts by distance and shows meters when GPS is on', () => {
    render(<HouseTable houses={houses} visited={new Set()} position={{ lat: 32.05, lng: 34.858 }} onToggle={vi.fn()} />);
    expect(rowsText()[0]).toContain('הירדן');
    expect(rowsText()[2]).toContain('צה"ל');
    expect(screen.getByText('11 מ׳')).toBeInTheDocument();
  });

  it('puts visited houses last and shows them checked', () => {
    render(<HouseTable houses={houses} visited={new Set(['mid'])} position={null} onToggle={vi.fn()} />);
    expect(rowsText()[2]).toContain('אלון');
    expect(screen.getByRole('checkbox', { name: /אלון/ })).toBeChecked();
  });

  it('toggles a house', async () => {
    const onToggle = vi.fn();
    render(<HouseTable houses={houses} visited={new Set()} position={null} onToggle={onToggle} />);
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /הירדן/ }));
    expect(onToggle).toHaveBeenCalledWith('near');
  });

  it('shows an empty state', () => {
    render(<HouseTable houses={[]} visited={new Set()} position={null} onToggle={vi.fn()} />);
    expect(screen.getByText(/עדיין אין בתים/)).toBeInTheDocument();
  });
});
