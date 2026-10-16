import { render, screen } from '@testing-library/react';
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

const STARTED = 'ההאלווין התחיל! צאו לאסוף ממתקים 🎃';
const NOTE = '(ואל תשכחו לצחצח שיניים טוב טוב לפני השינה 🪥🦷)';

describe('WelcomePopup', () => {
  it('shows the date before Halloween starts', () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T10:00:00Z'), toFake: ['Date'] });
    render(<WelcomePopup doc={fakeDoc()} />);
    expect(screen.getByText(/31 באוקטובר/)).toBeInTheDocument();
    expect(screen.queryByText(STARTED)).not.toBeInTheDocument();
  });

  it('says Halloween has started once it is 17:00 on the 31st', () => {
    vi.useFakeTimers({ now: new Date('2026-10-31T15:00:00Z'), toFake: ['Date'] });
    render(<WelcomePopup doc={fakeDoc()} />);
    expect(screen.getByText(STARTED)).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toHaveClass('started-note');
    expect(screen.queryByText(/31 באוקטובר/)).not.toBeInTheDocument();
  });

  it('pops up on the first visit of the day', () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T10:00:00Z'), toFake: ['Date'] });
    render(<WelcomePopup doc={fakeDoc()} />);
    expect(screen.getByRole('dialog', { name: /ברוכים הבאים/ })).toBeInTheDocument();
    expect(screen.getByText(/31 באוקטובר/)).toBeInTheDocument();
    expect(screen.getByText(/17:00/)).toBeInTheDocument();
  });

  it('stays hidden when it was already seen today', () => {
    render(<WelcomePopup doc={fakeDoc('halloween_welcome=1')} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with the button and remembers it for 24 hours', async () => {
    const doc = fakeDoc();
    render(<WelcomePopup doc={doc} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'יאללה, מתחילים!' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(doc.written[0]).toContain('max-age=86400');
  });

  it('also closes with Escape', async () => {
    const doc = fakeDoc();
    render(<WelcomePopup doc={doc} />);
    await userEvent.setup().keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(doc.written).toHaveLength(1);
  });

  it('explains how to use the map', () => {
    render(<WelcomePopup doc={fakeDoc()} />);
    expect(screen.getByText(/היינו כאן/)).toBeInTheDocument();
    expect(screen.getByText(/עם מבוגר/)).toBeInTheDocument();
  });
});
