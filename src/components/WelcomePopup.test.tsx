import { render, screen, within } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { WelcomePopup } from './WelcomePopup';

function fakeDoc(cookie = '') {
  const written: string[] = [];
  return {
    written,
    get cookie() {
      return cookie;
    },
    set cookie(v: string) {
      written.push(v);
    },
  };
}

afterEach(() => vi.useRealTimers());


describe('WelcomePopup', () => {
  it('pops up on the first visit of the day with just the countdown', () => {
    vi.useFakeTimers({ now: new Date('2026-10-29T10:00:00Z'), toFake: ['Date'] });
    render(<WelcomePopup doc={fakeDoc()} />);
    const dialog = screen.getByRole('dialog', { name: /ברוכים הבאים/ });
    expect(within(dialog).getByRole('timer')).toBeInTheDocument();
    expect(within(dialog).getByText(/31\.10 · 17:00/)).toBeInTheDocument();
  });

  it('no longer lists the how-to tips (they moved to the password screen)', () => {
    vi.useFakeTimers({ now: new Date('2026-10-29T10:00:00Z'), toFake: ['Date'] });
    render(<WelcomePopup doc={fakeDoc()} />);
    expect(screen.queryByText(/היינו כאן/)).not.toBeInTheDocument();
    expect(screen.queryByText(/עם מבוגר/)).not.toBeInTheDocument();
  });

  it('does not pop up at all once Halloween has started', () => {
    vi.useFakeTimers({ now: new Date('2026-10-31T15:00:00Z'), toFake: ['Date'] });
    const doc = fakeDoc();
    render(<WelcomePopup doc={doc} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(doc.written).toHaveLength(0);
  });

  it('stays hidden when it was already seen today', () => {
    vi.useFakeTimers({ now: new Date('2026-10-29T10:00:00Z'), toFake: ['Date'] });
    render(<WelcomePopup doc={fakeDoc('halloween_welcome=1')} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with the button and remembers it for 24 hours', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-29T10:00:00Z'), toFake: ['Date'] });
    const doc = fakeDoc();
    render(<WelcomePopup doc={doc} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'יאללה, מתחילים!' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(doc.written[0]).toContain('max-age=86400');
  });

  it('also closes with Escape', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-29T10:00:00Z'), toFake: ['Date'] });
    const doc = fakeDoc();
    render(<WelcomePopup doc={doc} />);
    await userEvent.setup().keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(doc.written).toHaveLength(1);
  });

});
