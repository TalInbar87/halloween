import { render, screen } from '@testing-library/react';
import { SeasonOver } from './SeasonOver';

describe('SeasonOver', () => {
  it('says see you next year', () => {
    render(<SeasonOver />);
    expect(screen.getByRole('heading', { name: /נתראה בשנה הבאה/ })).toBeInTheDocument();
  });

  it('thanks the neighbourhood', () => {
    render(<SeasonOver />);
    expect(screen.getByText(/תודה לכל השכונה/)).toBeInTheDocument();
  });

  it('cannot be closed', () => {
    render(<SeasonOver />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
