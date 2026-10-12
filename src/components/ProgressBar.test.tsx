import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('shows visited out of total', () => {
    render(<ProgressBar visited={3} total={10} />);
    expect(screen.getByText('3 / 10 בתים')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  });

  it('celebrates when every house was visited', () => {
    render(<ProgressBar visited={4} total={4} />);
    expect(screen.getByText(/סיימתם/)).toBeInTheDocument();
  });

  it('handles an empty map', () => {
    render(<ProgressBar visited={0} total={0} />);
    expect(screen.getByText(/עדיין אין בתים/)).toBeInTheDocument();
  });
});
