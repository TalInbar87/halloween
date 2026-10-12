import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { PasswordPrompt } from './PasswordPrompt';

function setup(verify = vi.fn().mockResolvedValue(undefined)) {
  const onUnlock = vi.fn();
  const onCancel = vi.fn();
  render(<PasswordPrompt verify={verify} onUnlock={onUnlock} onCancel={onCancel} />);
  return { verify, onUnlock, onCancel, user: userEvent.setup() };
}

describe('PasswordPrompt', () => {
  it('is a labelled dialog with a masked, focused field', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'כניסת מבוגרים' })).toBeInTheDocument();
    const input = screen.getByLabelText('סיסמת מבוגרים');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveFocus();
  });

  it('unlocks with the right password', async () => {
    const { verify, onUnlock, user } = setup();
    await user.type(screen.getByLabelText('סיסמת מבוגרים'), 'secret');
    await user.click(screen.getByRole('button', { name: 'כניסה' }));
    expect(verify).toHaveBeenCalledWith('secret');
    expect(onUnlock).toHaveBeenCalledWith('secret');
  });

  it('submits with Enter', async () => {
    const { onUnlock, user } = setup();
    await user.type(screen.getByLabelText('סיסמת מבוגרים'), 'secret{Enter}');
    expect(onUnlock).toHaveBeenCalledWith('secret');
  });

  it('shows an error and stays locked with a wrong password', async () => {
    const { onUnlock, user } = setup(vi.fn().mockRejectedValue(new Error('wrong_password')));
    await user.type(screen.getByLabelText('סיסמת מבוגרים'), 'nope');
    await user.click(screen.getByRole('button', { name: 'כניסה' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('סיסמה שגויה');
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('does not call the server with an empty password', async () => {
    const { verify, user } = setup();
    await user.click(screen.getByRole('button', { name: 'כניסה' }));
    expect(verify).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('נא להזין את סיסמת המבוגרים');
  });

  it('can be cancelled', async () => {
    const { onCancel, user } = setup();
    await user.click(screen.getByRole('button', { name: 'ביטול' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
