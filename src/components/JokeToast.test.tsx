import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { JokeToast } from './JokeToast';

afterEach(() => vi.useRealTimers());

const joke = { text: 'שקט, אני סופר סוכריות', emoji: '🤓🍬' };

describe('JokeToast', () => {
  it('shows the joke and its emoji in a polite live region', () => {
    render(<JokeToast joke={joke} onDone={vi.fn()} />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('שקט, אני סופר סוכריות');
    expect(toast).toHaveTextContent('🤓🍬');
  });

  it('sits in the middle of the screen with a candy burst', () => {
    render(<JokeToast joke={joke} onDone={vi.fn()} />);
    expect(screen.getByRole('status').closest('.joke-stage')).not.toBeNull();
    expect(document.querySelectorAll('.joke-burst span').length).toBeGreaterThanOrEqual(8);
  });

  it('adds a note when a whole building was just finished', () => {
    render(<JokeToast joke={joke} note="🏢 סיימתם את כל הבניין בנהר הירדן 27! 🎉" onDone={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('סיימתם את כל הבניין בנהר הירדן 27');
  });

  it('closes by itself after 3 seconds', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<JokeToast joke={joke} onDone={onDone} />);
    act(() => vi.advanceTimersByTime(2900));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('has no "tap to close" text', () => {
    render(<JokeToast joke={joke} onDone={vi.fn()} />);
    expect(screen.queryByText('הקישו לסגירה')).not.toBeInTheDocument();
  });

  it('can be tapped away anywhere', () => {
    const onDone = vi.fn();
    render(<JokeToast joke={joke} onDone={onDone} />);
    fireEvent.click(document.querySelector('.joke-stage')!);
    expect(onDone).toHaveBeenCalled();
  });

  it('restarts its timer for a new joke', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const { rerender } = render(<JokeToast joke={joke} onDone={onDone} />);
    act(() => vi.advanceTimersByTime(2000));
    rerender(<JokeToast joke={{ text: 'אחר', emoji: '🍫' }} onDone={onDone} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(onDone).not.toHaveBeenCalled();
  });
});
