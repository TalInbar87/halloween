import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Celebration } from './Celebration';

describe('Celebration', () => {
  it('stays hidden while houses are left', () => {
    render(<Celebration done={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not pop up if the round was already finished when the page opened', () => {
    render(<Celebration done />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pops up with confetti the moment the last house is marked', () => {
    const { rerender } = render(<Celebration done={false} />);
    rerender(<Celebration done />);
    expect(screen.getByRole('dialog', { name: /סיימתם את כל השכונה/ })).toBeInTheDocument();
    expect(document.querySelectorAll('.confetti-piece').length).toBeGreaterThan(20);
  });

  it('closes, and pops again only after another finish', async () => {
    const { rerender } = render(<Celebration done={false} />);
    rerender(<Celebration done />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'יששש!' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<Celebration done={false} />);
    rerender(<Celebration done />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
