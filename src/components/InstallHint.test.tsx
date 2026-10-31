import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach } from 'vitest';
import { InstallHint } from './InstallHint';

function memory(): Storage {
  const d = new Map<string, string>();
  return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v) } as unknown as Storage;
}

let storage: Storage;
beforeEach(() => {
  storage = memory();
});

function firePrompt() {
  const event = Object.assign(new Event('beforeinstallprompt'), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe('InstallHint', () => {
  it('tells iPhone users how to add it (Apple allows no install button)', () => {
    render(<InstallHint platform="ios" standalone={false} storage={storage} />);
    expect(screen.getByText(/הוספה למסך הבית/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התקנה' })).not.toBeInTheDocument();
  });

  it('warns iPhone users that marks are not shared with the browser', () => {
    render(<InstallHint platform="ios" standalone={false} storage={storage} />);
    expect(screen.getByText(/לא עוברים/)).toBeInTheDocument();
  });

  it('shows Android users menu instructions until the browser allows a button', () => {
    render(<InstallHint platform="android" standalone={false} storage={storage} />);
    expect(screen.getByText(/הוספה למסך הבית/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התקנה' })).not.toBeInTheDocument();
  });

  it('gives Android an install button that opens the system prompt', async () => {
    render(<InstallHint platform="android" standalone={false} storage={storage} />);
    const event = firePrompt();
    await userEvent.setup().click(screen.getByRole('button', { name: 'התקנה' }));
    expect(event.prompt).toHaveBeenCalled();
  });

  it('shows nothing on a computer', () => {
    const { container } = render(<InstallHint platform={null} standalone={false} storage={storage} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing inside the installed app', () => {
    const { container } = render(<InstallHint platform="ios" standalone storage={storage} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('can be closed, and stays closed', async () => {
    const { unmount, container } = render(<InstallHint platform="ios" standalone={false} storage={storage} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'סגירה' }));
    expect(container).toBeEmptyDOMElement();
    unmount();
    const again = render(<InstallHint platform="ios" standalone={false} storage={storage} />);
    expect(again.container).toBeEmptyDOMElement();
  });
});
