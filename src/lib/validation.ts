import { z } from 'zod';
import { isInServiceArea } from './geo';
import type { NewHouse } from './types';

// Limits must match the add_house SQL function.
export const ADDRESS_MAX = 200;
export const NOTES_MAX = 200;
export const UNIT_MAX = 10;

// eslint-disable-next-line no-control-regex
const NO_CONTROL_CHARS = /^[^\u0000-\u001f\u007f]*$/;
export const PIN_PATTERN = /^\d{4}$/;

const optionalText = (max: number) =>
  z.string().trim().max(max, `עד ${max} תווים`).regex(NO_CONTROL_CHARS, 'תווים לא חוקיים');

const schema = z.object({
  address: z
    .string()
    .trim()
    .min(3, 'נא להזין כתובת')
    .max(ADDRESS_MAX, `עד ${ADDRESS_MAX} תווים`)
    .regex(NO_CONTROL_CHARS, 'תווים לא חוקיים'),
  apartment: optionalText(UNIT_MAX),
  floor: optionalText(UNIT_MAX),
  notes: optionalText(NOTES_MAX),
  pin: z.string().regex(PIN_PATTERN, 'קוד של 4 ספרות'),
  location: z
    .object({ lat: z.number().nullable(), lng: z.number().nullable() })
    .refine((l) => l.lat !== null && l.lng !== null, 'נא לסמן את הבית על המפה')
    .refine((l) => l.lat === null || l.lng === null || isInServiceArea(l.lat, l.lng), 'המיקום מחוץ לאזור'),
  consent: z.literal(true, { errorMap: () => ({ message: 'נא לאשר הצגת הכתובת במפה' }) }),
});

export interface HouseFormInput {
  address: string;
  apartment: string;
  floor: string;
  notes: string;
  pin: string;
  lat: number | null;
  lng: number | null;
  consent: boolean;
}

export type HouseFormErrors = Partial<
  Record<'address' | 'apartment' | 'floor' | 'notes' | 'pin' | 'location' | 'consent', string>
>;

export type ValidationResult = { ok: true; value: NewHouse } | { ok: false; errors: HouseFormErrors };

export function validateHouseInput(input: HouseFormInput): ValidationResult {
  const parsed = schema.safeParse({
    address: input.address,
    apartment: input.apartment,
    floor: input.floor,
    notes: input.notes,
    pin: input.pin,
    location: { lat: input.lat, lng: input.lng },
    consent: input.consent,
  });
  if (!parsed.success) {
    const errors: HouseFormErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof HouseFormErrors;
      errors[field] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const { address, apartment, floor, notes, pin, location } = parsed.data;
  return {
    ok: true,
    value: {
      address,
      apartment: apartment || null,
      floor: floor || null,
      notes: notes || null,
      pin,
      lat: location.lat!,
      lng: location.lng!,
    },
  };
}
