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
    submit: vi.fn().mockResolvedValue('h1'),
    geocode: vi.fn().mockResolvedValue([{ lat: 32.051, lng: 34.859, label: 'נהר הירדן 12, קרית אונו' }]),
    reverseGeocode: vi.fn().mockResolvedValue({ street: 'נהר הירדן', houseNumber: '14' }),
    locate: vi.fn().mockResolvedValue({ lat: 32.0508, lng: 34.8581 }),
    onAdded: vi.fn(),
    Picker: StubPicker,
    ...overrides,
  };
  render(<AddHouseForm {...props} />);
  return { ...props, user: userEvent.setup() };
}

const submitBtn = () => screen.getByRole('button', { name: 'הוסיפו לי את הבית' });
const street = () => screen.getByLabelText('רחוב');
const number = () => screen.getByLabelText('מספר');

async function typeAddress(user: ReturnType<typeof userEvent.setup>, s: string, n: string) {
  await user.type(street(), s);
  await user.type(number(), n);
}

describe('AddHouseForm', () => {
  it('has separate street and number fields, with the city fixed to Kiryat Ono', () => {
    setup();
    expect(street().closest('.street-row')).toBe(number().closest('.street-row'));
    expect(screen.getByText('קרית אונו')).toBeInTheDocument();
    expect(screen.queryByLabelText('כתובת')).not.toBeInTheDocument();
  });

  it('shows validation errors in Hebrew and does not submit', async () => {
    const { submit, user } = setup();
    await user.click(submitBtn());
    expect(await screen.findByText('נא להזין רחוב')).toBeInTheDocument();
    expect(screen.getByText('נא להזין מספר בית')).toBeInTheDocument();
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

  it('puts an optional building code next to apartment and floor', () => {
    setup();
    const code = screen.getByLabelText('קוד לבניין');
    expect(code.closest('.unit-row')).toBe(screen.getByLabelText('קומה').closest('.unit-row'));
    expect(code).toHaveAttribute('placeholder', 'לא חובה');
  });

  describe('edit mode', () => {
    const initial = {
      id: 'h9',
      address: 'נהר הירדן 23',
      street: 'נהר הירדן',
      house_number: '23',
      apartment: '20',
      floor: '5',
      building_code: null,
      out_of_candy: false,
      notes: 'בלי בוטנים',
      lat: 32.0507,
      lng: 34.858,
      created_at: 'x',
    };

    it('starts filled with the existing house, pin included and consent given', () => {
      setup({ initial });
      expect(screen.getByRole('heading', { name: 'עריכת בית' })).toBeInTheDocument();
      expect(street()).toHaveValue('נהר הירדן');
      expect(number()).toHaveValue('23');
      expect(screen.getByLabelText('דירה')).toHaveValue('20');
      expect(screen.getByLabelText('קומה')).toHaveValue('5');
      expect(screen.getByLabelText(/הערות/)).toHaveValue('בלי בוטנים');
      expect(screen.getByTestId('pin')).toHaveTextContent('32.0507,34.858');
      expect(screen.getByLabelText(/מסכימים/)).toBeChecked();
    });

    it('splits an old free-text address that has no street/number yet', () => {
      setup({ initial: { ...initial, address: 'נהר הירדן 27 קרית אונו', street: null, house_number: null } });
      expect(street()).toHaveValue('נהר הירדן');
      expect(number()).toHaveValue('27');
    });

    it('saves the edited values', async () => {
      const { submit, onAdded, user } = setup({ initial });
      await user.clear(number());
      await user.type(number(), '25');
      await user.click(screen.getByRole('button', { name: 'stub-set-pin' }));
      await user.click(screen.getByRole('button', { name: 'שמירת שינויים' }));
      await waitFor(() =>
        expect(submit).toHaveBeenCalledWith({
          street: 'נהר הירדן',
          house_number: '25',
          apartment: '20',
          floor: '5',
          building_code: null,
          notes: 'בלי בוטנים',
          lat: 32.05,
          lng: 34.858,
        }),
      );
      expect(onAdded).toHaveBeenCalled();
    });

    it('can be cancelled', async () => {
      const onCancel = vi.fn();
      const { user } = setup({ initial, onCancel });
      await user.click(screen.getByRole('button', { name: 'ביטול' }));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  it('places the consent checkbox above the map', () => {
    setup();
    const consent = screen.getByLabelText(/מסכימים/);
    const picker = screen.getByTestId('picker');
    expect(consent.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('tells the user to check and fine-tune the pin', () => {
    setup();
    expect(
      screen.getByText('וודאו במפה שהכתובת מדוייקת, ניתן לדייק בעזרת הזזה של הבית למען דיוק מירבי'),
    ).toBeInTheDocument();
  });

  it('offers "use my location" next to the address search', () => {
    setup();
    const search = screen.getByRole('button', { name: 'חפשו במפה' });
    const locate = screen.getByRole('button', { name: /השתמשו במיקום שלי/ });
    expect(search.closest('.address-actions')).toBe(locate.closest('.address-actions'));
    expect(search.closest('.address-actions')).not.toBeNull();
  });

  it('searches street + number in Kiryat Ono and drops the pin there', async () => {
    const { geocode, user } = setup();
    await typeAddress(user, 'נהר הירדן', '12');
    await user.click(screen.getByRole('button', { name: 'חפשו במפה' }));
    expect(geocode).toHaveBeenCalledWith('נהר הירדן 12, קרית אונו');
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('32.051,34.859'));
  });

  it('tells the user when the address was not found', async () => {
    const { user } = setup({ geocode: vi.fn().mockResolvedValue([]) });
    await typeAddress(user, 'רחוב שלא קיים', '1');
    await user.click(screen.getByRole('button', { name: 'חפשו במפה' }));
    expect(await screen.findByText(/לא מצאנו/)).toBeInTheDocument();
  });

  it('tells the user when the address search fails', async () => {
    const { user } = setup({ geocode: vi.fn().mockRejectedValue(new Error('429')) });
    await typeAddress(user, 'נהר הירדן', '12');
    await user.click(screen.getByRole('button', { name: 'חפשו במפה' }));
    expect(await screen.findByText(/החיפוש לא זמין/)).toBeInTheDocument();
  });

  it('uses my location: drops the pin and fills street and number', async () => {
    const { locate, reverseGeocode, user } = setup();
    await user.click(screen.getByRole('button', { name: /השתמשו במיקום שלי/ }));
    expect(locate).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('32.0508,34.8581'));
    expect(reverseGeocode).toHaveBeenCalledWith({ lat: 32.0508, lng: 34.8581 });
    await waitFor(() => expect(street()).toHaveValue('נהר הירדן'));
    expect(number()).toHaveValue('14');
  });

  it('does not overwrite an address the user already typed', async () => {
    const { reverseGeocode, user } = setup();
    await user.type(street(), 'נהר הירדן');
    await user.click(screen.getByRole('button', { name: /השתמשו במיקום שלי/ }));
    await waitFor(() => expect(screen.getByTestId('pin')).toHaveTextContent('32.0508,34.8581'));
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(street()).toHaveValue('נהר הירדן');
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
    await typeAddress(user, 'נהר הירדן', '12');
    await user.type(screen.getByLabelText('דירה'), '4');
    await user.type(screen.getByLabelText('קומה'), '2');
    await user.type(screen.getByLabelText('קוד לבניין'), '1234#');
    await user.type(screen.getByLabelText(/הערות/), 'ממתקים בלי בוטנים');
    await user.click(screen.getByRole('button', { name: 'stub-set-pin' }));
    await user.click(screen.getByLabelText(/מסכימים/));
    await user.click(submitBtn());
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith({
        street: 'נהר הירדן',
        house_number: '12',
        apartment: '4',
        floor: '2',
        building_code: '1234#',
        notes: 'ממתקים בלי בוטנים',
        lat: 32.05,
        lng: 34.858,
      }),
    );
    expect(onAdded).toHaveBeenCalled();
    expect(await screen.findByText(/הבית נוסף/)).toBeInTheDocument();
  });

  it('shows a friendly error when the server rejects', async () => {
    const { user } = setup({ submit: vi.fn().mockRejectedValue(new Error('rate_limited')) });
    await typeAddress(user, 'נהר הירדן', '12');
    await user.click(screen.getByRole('button', { name: 'stub-set-pin' }));
    await user.click(screen.getByLabelText(/מסכימים/));
    await user.click(submitBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent(/יותר מדי/);
  });

  it('says so when the adults password is wrong, and keeps the form filled', async () => {
    const { user } = setup({ submit: vi.fn().mockRejectedValue(new Error('wrong_password')) });
    await typeAddress(user, 'נהר הירדן', '12');
    await user.click(screen.getByRole('button', { name: 'stub-set-pin' }));
    await user.click(screen.getByLabelText(/מסכימים/));
    await user.click(submitBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent('סיסמה שגויה');
    expect(street()).toHaveValue('נהר הירדן');
  });

  it('has no password field (the admin panel is already unlocked)', () => {
    setup();
    expect(screen.queryByLabelText('סיסמת מבוגרים')).not.toBeInTheDocument();
  });
});
