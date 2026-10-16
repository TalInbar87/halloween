import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { NavBar } from './NavBar';
import type { House } from '../lib/types';

const target: House = {
  id: 't',
  address: 'נהר הירדן 27',
  street: 'נהר הירדן',
  house_number: '27',
  apartment: '12',
  floor: null,
  building_code: null,
  out_of_candy: false,
  lat: 32.051,
  lng: 34.858,
  notes: null,
  created_at: 'x',
};

function setup(over: Partial<Parameters<typeof NavBar>[0]> = {}) {
  const props = {
    target,
    position: { lat: 32.05, lng: 34.858 },
    visited: false,
    onStop: vi.fn(),
    onMarkVisited: vi.fn(),
    onNext: vi.fn(),
    ...over,
  };
  render(<NavBar {...props} />);
  return { ...props, user: userEvent.setup() };
}

describe('NavBar', () => {
  it('shows where we are going and how far', () => {
    setup();
    const bar = screen.getByRole('status');
    expect(bar).toHaveTextContent('נהר הירדן 27 · דירה 12');
    expect(bar).toHaveTextContent('111 מ׳');
  });

  it('points an arrow toward the house (north = 0°)', () => {
    setup();
    expect(screen.getByTestId('nav-arrow').style.transform).toBe('rotate(0deg)');
  });

  it('can be stopped', async () => {
    const { onStop, user } = setup();
    await user.click(screen.getByRole('button', { name: 'הפסקת ניווט' }));
    expect(onStop).toHaveBeenCalled();
  });

  it('says "arrived" nearby and offers to mark the house — it never marks by itself', async () => {
    const { onMarkVisited, user } = setup({ position: { lat: 32.0509, lng: 34.858 } });
    expect(screen.getByRole('status')).toHaveTextContent('הגעתם!');
    expect(onMarkVisited).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'היינו כאן!' }));
    expect(onMarkVisited).toHaveBeenCalled();
  });

  it('offers the next house once this one is marked', async () => {
    const { onNext, user } = setup({ position: { lat: 32.0509, lng: 34.858 }, visited: true });
    await user.click(screen.getByRole('button', { name: 'לבית הבא' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('waits for GPS before showing a distance', () => {
    setup({ position: null });
    expect(screen.getByRole('status')).toHaveTextContent('מחפשים את המיקום');
  });
});
