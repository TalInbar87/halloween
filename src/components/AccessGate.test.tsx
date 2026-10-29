import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AccessGate } from './AccessGate';

function setup(over: Partial<Parameters<typeof AccessGate>[0]> = {}) {
  const props = { onUnlock: vi.fn().mockResolvedValue(undefined), ...over };
  render(<AccessGate {...props} />);
  return { ...props, user: userEvent.setup() };
}

describe('AccessGate', () => {
  it('explains the map is for the neighbourhood and asks for a masked password', () => {
    setup();
    expect(screen.getByRole('heading', { name: /רק לשכונה/ })).toBeInTheDocument();
    const input = screen.getByLabelText('סיסמת השכונה');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveFocus();
  });

  it('explains how the map works (the tips moved here from the welcome popup)', () => {
    setup();
    for (const tip of [/כל דלעת במפה היא בית שמחלק ממתקים/, /היינו כאן/, /הראו איפה אני/, /יוצאים תמיד עם מבוגר/]) {
      expect(screen.getByText(tip)).toBeInTheDocument();
    }
  });

  it('unlocks with the password', async () => {
    const { onUnlock, user } = setup();
    await user.type(screen.getByLabelText('סיסמת השכונה'), 'ourstreet{Enter}');
    expect(onUnlock).toHaveBeenCalledWith('ourstreet');
  });

  it('shows "wrong password" and stays', async () => {
    const { user } = setup({ onUnlock: vi.fn().mockRejectedValue(new Error('wrong_password')) });
    await user.type(screen.getByLabelText('סיסמת השכונה'), 'nope');
    await user.click(screen.getByRole('button', { name: 'כניסה למפה' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('סיסמה שגויה');
  });

  it('does not send an empty password', async () => {
    const { onUnlock, user } = setup();
    await user.click(screen.getByRole('button', { name: 'כניסה למפה' }));
    expect(onUnlock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('נא להזין את סיסמת השכונה');
  });

  it('can explain that the password was changed', () => {
    setup({ notice: 'הסיסמה התחלפה. בקשו את החדשה מהמארגנים.' });
    expect(screen.getByText('הסיסמה התחלפה. בקשו את החדשה מהמארגנים.')).toBeInTheDocument();
  });
});
