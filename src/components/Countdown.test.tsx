import { act, render, screen } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { Countdown } from './Countdown';

const target = new Date('2026-10-31T15:00:00Z');

afterEach(() => vi.useRealTimers());

describe('Countdown', () => {
  it('shows days, hours, minutes and seconds with Hebrew labels', () => {
    vi.useFakeTimers({ now: new Date('2026-10-16T12:30:15Z') });
    render(<Countdown target={target} />);
    const timer = screen.getByRole('timer');
    expect(timer).toHaveTextContent('15ימים');
    expect(timer).toHaveTextContent('02שעות');
    expect(timer).toHaveTextContent('29דקות');
    expect(timer).toHaveTextContent('45שניות');
    expect(screen.getByText(/31\.10 · 17:00/)).toBeInTheDocument();
  });

  it('reads left to right like a clock: days, hours, minutes, seconds', () => {
    vi.useFakeTimers({ now: new Date('2026-10-16T12:30:15Z') });
    render(<Countdown target={target} />);
    const timer = screen.getByRole('timer');
    expect(timer).toHaveAttribute('dir', 'ltr');
    expect([...timer.children].map((c) => c.lastChild?.textContent)).toEqual(['ימים', 'שעות', 'דקות', 'שניות']);
  });

  it('ticks every second', () => {
    vi.useFakeTimers({ now: new Date('2026-10-16T12:30:15Z') });
    render(<Countdown target={target} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('timer')).toHaveTextContent('44שניות');
  });

  it('switches to a "we started" message at the start time', () => {
    vi.useFakeTimers({ now: new Date('2026-10-31T14:59:59Z') });
    render(<Countdown target={target} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.getByText('ההאלווין התחיל! צאו לאסוף ממתקים 🎃')).toBeInTheDocument();
    const note = screen.getByText('(ואל תשכחו לצחצח שיניים טוב טוב לפני השינה 🪥🦷)');
    expect(note).toHaveClass('started-note');
  });

  it('has an accessible summary for screen readers', () => {
    vi.useFakeTimers({ now: new Date('2026-10-16T12:30:15Z') });
    render(<Countdown target={target} />);
    expect(screen.getByRole('timer')).toHaveAccessibleName(/15 ימים/);
  });
});
