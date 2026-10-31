import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, afterEach } from 'vitest';
import { ShareList } from './ShareList';
import type { House } from '../lib/types';

const houses: House[] = [
  {
    id: 'a',
    address: 'יפה נוף 38',
    street: null,
    house_number: null,
    apartment: null,
    floor: null,
    building_code: null,
    out_of_candy: false,
    lat: 32,
    lng: 34.8,
    notes: null,
    created_at: 'x',
  },
];

function setNavigator(share?: unknown, writeText?: unknown) {
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

afterEach(() => setNavigator(undefined, undefined));

describe('ShareList', () => {
  it('shares the formatted list through the phone share menu', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator(share);
    render(<ShareList houses={houses} />);
    await userEvent.setup({ writeToClipboard: false }).click(screen.getByRole('button', { name: /שיתוף בוואטסאפ/ }));
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].text).toContain('*יפה נוף 38*');
  });

  it('hides the share button when the browser has no share menu', () => {
    setNavigator(undefined, vi.fn());
    render(<ShareList houses={houses} />);
    expect(screen.queryByRole('button', { name: /שיתוף בוואטסאפ/ })).not.toBeInTheDocument();
  });

  it('says nothing went wrong when the user cancels the share menu', async () => {
    setNavigator(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })));
    render(<ShareList houses={houses} />);
    await userEvent.setup({ writeToClipboard: false }).click(screen.getByRole('button', { name: /שיתוף בוואטסאפ/ }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('copies the list and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    render(<ShareList houses={houses} />);
    const user = userEvent.setup({ writeToClipboard: false });
    setNavigator(undefined, writeText);
    await user.click(screen.getByRole('button', { name: /העתקת הרשימה/ }));
    expect(writeText.mock.calls[0][0]).toContain('*יפה נוף 38*');
    expect(await screen.findByRole('status')).toHaveTextContent(/הועתקה/);
  });

  it('explains when copying is blocked', async () => {
    render(<ShareList houses={houses} />);
    const user = userEvent.setup({ writeToClipboard: false });
    setNavigator(undefined, vi.fn().mockRejectedValue(new Error('denied')));
    await user.click(screen.getByRole('button', { name: /העתקת הרשימה/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(/לא הצלחנו/);
  });
});
