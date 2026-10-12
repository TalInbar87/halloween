import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AddHouseForm, type PickerProps } from './AddHouseForm';

function StubPicker({ value, onChange }: PickerProps) {
  return (
    <div data-testid="picker">
      <span data-testid="pin">{value ? `${value.lat},${value.lng}` : 'none'}</span>
      <button type="button" onClick={() => onChange({ lat: 32.05, lng: 34.858 })}>
        stub-set-pin
      </button>
    </div>
  );
}

function setup(overrides: Partial<Parameters<typeof AddHouseForm>[0]> = {}) {
  const props = {
    submit: vi.fn().mockResolvedValue({ id: 'h1', deleteToken: 't1' }),
    geocode: vi.fn().mockResolvedValue([{ lat: 32.051, lng: 34.859, label: 'הירדן 12, קרית אונו' }]),
    reverseGeocode: vi.fn().mockResolvedValue('הירדן 14, קרית אונו'),
    locate: vi.fn().mockResolvedValue({ lat: 32.0508, lng: 34.8581 }),
    onAdded: vi.fn(),
    Picker: StubPicker,
    ...overrides,
  };
  render(<AddHouseForm {...props} />);
  return { ...props, user: userEvent.setup() };
}

const submitBtn = () => screen.getByRole('button', { name: 'הוסיפו לי את הבית' });

describe('AddHouseForm', () => {
  it('shows validation errors in Hebrew and does not submit', async () => {
    const { submit, user } = setup();
    await user.click(submitBtn());
    expect(await screen.findByText('נא להזין כתובת')).toBeInTheDocument();
    expect(screen.getByText('נא לסמן את הבית על המפה')).toBeInTheDocument();
    expect(screen.getByText('נא לאשר הצגת הכתובת במפה')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('places the notes field above the map', () => {
    setup();
    const notes = screen.getByLabelText(/הערות/);
    const picker = screen.getByTestId('picker');
    expect(notes.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers "use my location" next to the address search', () => {
    setup();
    const search = screen.getByRole('button', { name: 'חפשו במפה' });
    const locate = screen.getByRole('button', { name: /השתמשו במיקום שלי/ });
    expect(search.closest('.address-actions')).toBe(locate.closest('.address-actions'));
    expect(search.closest('.address-actions')).not.toBeNull();
  });

  it('finds the address and drops the pin there', async () => {
    const { geocode, user } = setup();
    await user.type(screen.getByLabelText('כתובת'), 'הירדן 12');
    await user.click(screen.getByRole('button', { name: 'חפשו במפה' }));
    expect(geocode).toHaveBeenCalledWith('הירדן 12');
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('32.051,34.859'));
  });

  it('tells the user when the address was not found', async () => {
    const { user } = setup({ geocode: vi.fn().mockResolvedValue([]) });
    await user.type(screen.getByLabelText('כתובת'), 'רחוב שלא קיים');
    await user.click(screen.getByRole('button', { name: 'חפשו במפה' }));
    expect(await screen.findByText(/לא מצאנו/)).toBeInTheDocument();
  });

  it('tells the user when the address search fails', async () => {
    const { user } = setup({ geocode: vi.fn().mockRejectedValue(new Error('429')) });
    await user.type(screen.getByLabelText('כתובת'), 'הירדן 12');
    await user.click(screen.getByRole('button', { name: 'חפשו במפה' }));
    expect(await screen.findByText(/החיפוש לא זמין/)).toBeInTheDocument();
  });

  it('uses my location: drops the pin and fills the address', async () => {
    const { locate, reverseGeocode, user } = setup();
    await user.click(screen.getByRole('button', { name: /השתמשו במיקום שלי/ }));
    expect(locate).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('32.0508,34.8581'));
    expect(reverseGeocode).toHaveBeenCalledWith({ lat: 32.0508, lng: 34.8581 });
    await waitFor(() => expect(screen.getByLabelText('כתובת')).toHaveValue('הירדן 14, קרית אונו'));
  });

  it('does not overwrite an address the user already typed', async () => {
    const { reverseGeocode, user } = setup();
    await user.type(screen.getByLabelText('כתובת'), 'הירדן 20');
    await user.click(screen.getByRole('button', { name: /השתמשו במיקום שלי/ }));
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('32.0508,34.8581'));
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(screen.getByLabelText('כתובת')).toHaveValue('הירדן 20');
  });

  it('keeps the pin and asks for the address when reverse lookup fails', async () => {
    const { user } = setup({ reverseGeocode: vi.fn().mockRejectedValue(new Error('x')) });
    await user.click(screen.getByRole('button', { name: /השתמשו במיקום שלי/ }));
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('32.0508,34.8581'));
    expect(await screen.findByText(/הקלידו את הכתובת/)).toBeInTheDocument();
  });

  it('explains when location is unavailable', async () => {
    const { user } = setup({ locate: vi.fn().mockRejectedValue(new Error('denied')) });
    await user.click(screen.getByRole('button', { name: /השתמשו במיקום שלי/ }));
    expect(await screen.findByText(/לא הצלחנו לקבל מיקום/)).toBeInTheDocument();
    expect(screen.getByTestId('pin')).toHaveTextContent('none');
  });

  it('submits a valid house and reports success', async () => {
    const { submit, onAdded, user } = setup();
    await user.type(screen.getByLabelText('כתובת'), 'הירדן 12');
    await user.type(screen.getByLabelText(/הערות/), 'ממתקים בלי בוטנים');
    await user.click(screen.getByRole('button', { name: 'stub-set-pin' }));
    await user.click(screen.getByLabelText(/מסכימים/));
    await user.click(submitBtn());
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith({ address: 'הירדן 12', notes: 'ממתקים בלי בוטנים', lat: 32.05, lng: 34.858 }),
    );
    expect(onAdded).toHaveBeenCalledWith({ id: 'h1', deleteToken: 't1' });
    expect(await screen.findByText(/הבית נוסף/)).toBeInTheDocument();
  });

  it('shows a friendly error when the server rejects', async () => {
    const { user } = setup({ submit: vi.fn().mockRejectedValue(new Error('rate_limited')) });
    await user.type(screen.getByLabelText('כתובת'), 'הירדן 12');
    await user.click(screen.getByRole('button', { name: 'stub-set-pin' }));
    await user.click(screen.getByLabelText(/מסכימים/));
    await user.click(submitBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent(/יותר מדי/);
  });
});
