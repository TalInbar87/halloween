import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { JokeToast } from './JokeToast';

afterEach(() => vi.useRealTimers());

describe('JokeToast', () => {
  it('pops the joke in a polite live region', () => {
    render(<JokeToast joke="שקט, אני סופר סוכריות 🤓🍬" onDone={vi.fn()} />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('שקט, אני סופר סוכריות 🤓🍬');
  });

  it('goes away by itself after a few seconds', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<JokeToast joke="x" onDone={onDone} />);
    act(() => vi.advanceTimersByTime(3000));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('can be tapped away', () => {
    const onDone = vi.fn();
    render(<JokeToast joke="x" onDone={onDone} />);
    fireEvent.click(screen.getByRole('status'));
    expect(onDone).toHaveBeenCalled();
  });

  it('restarts its timer for a new joke', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { rerender } = render(<JokeToast joke="a" onDone={onDone} />);
    act(() => vi.advanceTimersByTime(4000));
    rerender(<JokeToast joke="b" onDone={onDone} />);
    act(() => vi.advanceTimersByTime(4000));
    expect(onDone).not.toHaveBeenCalled();
  });
});
