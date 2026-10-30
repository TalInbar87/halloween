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
  out_of_candy: false,
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

  it('sorts by address, then floor, then apartment by default, even with GPS on', () => {
    const list = [
      house('a', 'אלון 3', 32.05, { floor: '10', apartment: '20' }),
      house('b', 'בר 1', 32.05),
      house('c', 'אלון 3', 32.05, { floor: '2', apartment: '5' }),
      house('d', 'אלון 3', 32.05, { floor: '2', apartment: '4' }),
    ];
    render(<HouseTable houses={list} visited={new Set()} position={{ lat: 32.05, lng: 34.858 }} onToggle={vi.fn()} />);
    expect(rowsText()).toEqual(['אלון 3 · דירה 4, קומה 2', 'אלון 3 · דירה 5, קומה 2', 'אלון 3 · דירה 20, קומה 10', 'בר 1']);
  });

  it('shows meters when GPS is on, without changing the order', () => {
    render(<HouseTable houses={houses} visited={new Set()} position={{ lat: 32.05, lng: 34.858 }} onToggle={vi.fn()} />);
    expect(rowsText()[0]).toContain('אלון');
    expect(screen.getByText('11 מ׳')).toBeInTheDocument();
  });

  it('filters by address', async () => {
    render(<HouseTable houses={houses} visited={new Set()} position={null} onToggle={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: 'חיפוש לפי כתובת' }), 'צהל');
    expect(rowsText()).toHaveLength(1);
    expect(rowsText()[0]).toContain('צה"ל');
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'אין כזה');
    expect(screen.getByText('אין בתים שמתאימים לחיפוש')).toBeInTheDocument();
  });

  it('moves visited houses to the bottom, still in order, and shows them checked', () => {
    render(<HouseTable houses={houses} visited={new Set(['mid', 'far'])} position={null} onToggle={vi.fn()} />);
    const rows = rowsText();
    expect(rows[0]).toContain('הירדן');
    expect(rows[1]).toContain('אלון');
    expect(rows[2]).toContain('צה"ל');
    expect(screen.getByRole('checkbox', { name: /אלון/ })).toBeChecked();
  });

  it('labels houses that ran out of candy', () => {
    render(
      <HouseTable
        houses={[{ ...houses[0], out_of_candy: true }]}
        visited={new Set()}
        position={null}
        onToggle={vi.fn()}
       
      />,
    );
    expect(screen.getByText('נגמרו הממתקים 😢')).toBeInTheDocument();
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
