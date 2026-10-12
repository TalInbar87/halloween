import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AddHouseForm, type PickerProps } from './AddHouseForm';

function StubPicker({ value, onChange }: PickerProps) {
  return (
    <div>
      <span data-testid="pin">{value ? `${value.lat},${value.lng}` : 'none'}</span>
      <button type="button" onClick={() => onChange({ lat: 31.97, lng: 34.79 })}>
        stub-set-pin
      </button>
    </div>
  );
}

function setup(overrides: Partial<Parameters<typeof AddHouseForm>[0]> = {}) {
  const submit = vi.fn().mockResolvedValue({ id: 'h1', deleteToken: 't1' });
  const geocode = vi.fn().mockResolvedValue([{ lat: 31.96, lng: 34.8, label: 'הרצל 10, ראשון לציון' }]);
  const onAdded = vi.fn();
  render(<AddHouseForm submit={submit} geocode={geocode} onAdded={onAdded} Picker={StubPicker} {...overrides} />);
  return { submit, geocode, onAdded, user: userEvent.setup() };
}

describe('AddHouseForm', () => {
  it('shows validation errors in Hebrew and does not submit', async () => {
    const { submit, user } = setup();
    await user.click(screen.getByRole('button', { name: 'הוסיפו לי את הבית' }));
    expect(await screen.findByText('נא להזין כתובת')).toBeInTheDocument();
    expect(screen.getByText('נא לסמן את הבית על המפה')).toBeInTheDocument();
    expect(screen.getByText('נא לאשר הצגת הכתובת במפה')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('finds the address and drops the pin there', async () => {
    const { geocode, user } = setup();
    await user.type(screen.getByLabelText('כתובת'), 'הרצל 10');
    await user.click(screen.getByRole('button', { name: 'חפשו במפה' }));
    expect(geocode).toHaveBeenCalledWith('הרצל 10');
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('31.96,34.8'));
  });

  it('tells the user when the address was not found', async () => {
    const { user } = setup({ geocode: vi.fn().mockResolvedValue([]) });
    await user.type(screen.getByLabelText('כתובת'), 'רחוב שלא קיים');
    await user.click(screen.getByRole('button', { name: 'חפשו במפה' }));
    expect(await screen.findByText(/לא מצאנו/)).toBeInTheDocument();
  });

  it('tells the user when the address search fails', async () => {
    const { user } = setup({ geocode: vi.fn().mockRejectedValue(new Error('429')) });
    await user.type(screen.getByLabelText('כתובת'), 'הרצל 10');
    await user.click(screen.getByRole('button', { name: 'חפשו במפה' }));
    expect(await screen.findByText(/החיפוש לא זמין/)).toBeInTheDocument();
  });

  it('submits a valid house and reports success', async () => {
    const { submit, onAdded, user } = setup();
    await user.type(screen.getByLabelText('כתובת'), 'הרצל 10');
    await user.type(screen.getByLabelText(/הערות/), 'ממתקים בלי בוטנים');
    await user.click(screen.getByRole('button', { name: 'stub-set-pin' }));
    await user.click(screen.getByLabelText(/מסכימים/));
    await user.click(screen.getByRole('button', { name: 'הוסיפו לי את הבית' }));
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith({ address: 'הרצל 10', notes: 'ממתקים בלי בוטנים', lat: 31.97, lng: 34.79 }),
    );
    expect(onAdded).toHaveBeenCalledWith({ id: 'h1', deleteToken: 't1' });
    expect(await screen.findByText(/הבית נוסף/)).toBeInTheDocument();
  });

  it('shows a friendly error when the server rejects', async () => {
    const { user } = setup({ submit: vi.fn().mockRejectedValue(new Error('rate_limited')) });
    await user.type(screen.getByLabelText('כתובת'), 'הרצל 10');
    await user.click(screen.getByRole('button', { name: 'stub-set-pin' }));
    await user.click(screen.getByLabelText(/מסכימים/));
    await user.click(screen.getByRole('button', { name: 'הוסיפו לי את הבית' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/יותר מדי/);
  });
});
