import { z } from 'zod';
import { isInServiceArea } from './geo';
import type { NewHouse } from './types';

// Limits must match the add_house SQL function.
export const STREET_MAX = 100;
export const HOUSE_NUMBER_MAX = 5;
export const NOTES_MAX = 200;
export const UNIT_MAX = 10;
export const BUILDING_CODE_MAX = 20;

// eslint-disable-next-line no-control-regex
const NO_CONTROL_CHARS = /^[^\u0000-\u001f\u007f]*$/;

const optionalText = (max: number) =>
  z.string().trim().max(max, `עד ${max} תווים`).regex(NO_CONTROL_CHARS, 'תווים לא חוקיים');

const schema = z.object({
  street: z
    .string()
    .transform((v) => v.replace(/\s+/g, ' ').trim())
    .pipe(
      z
        .string()
        .min(2, 'נא להזין רחוב')
        .max(STREET_MAX, `עד ${STREET_MAX} תווים`)
        .regex(NO_CONTROL_CHARS, 'תווים לא חוקיים'),
    ),
  houseNumber: z
    .string()
    .transform((v) => v.replace(/\s+/g, ''))
    .pipe(z.string().min(1, 'נא להזין מספר בית').regex(/^\d{1,4}[א-ת]?$/, 'מספר בית לא תקין (למשל 27 או 27א)')),
  apartment: optionalText(UNIT_MAX),
  floor: optionalText(UNIT_MAX),
  buildingCode: optionalText(BUILDING_CODE_MAX),
  notes: optionalText(NOTES_MAX),
  location: z
    .object({ lat: z.number().nullable(), lng: z.number().nullable() })
    .refine((l) => l.lat !== null && l.lng !== null, 'נא לסמן את הבית על המפה')
    .refine((l) => l.lat === null || l.lng === null || isInServiceArea(l.lat, l.lng), 'המיקום מחוץ לאזור'),
  consent: z.literal(true, { errorMap: () => ({ message: 'נא לאשר הצגת הכתובת במפה' }) }),
});

export interface HouseFormInput {
  street: string;
  houseNumber: string;
  apartment: string;
  floor: string;
  buildingCode: string;
  notes: string;
  lat: number | null;
  lng: number | null;
  consent: boolean;
}

export type HouseFormErrors = Partial<
  Record<'street' | 'houseNumber' | 'apartment' | 'floor' | 'buildingCode' | 'notes' | 'location' | 'consent', string>
>;

export type ValidationResult = { ok: true; value: NewHouse } | { ok: false; errors: HouseFormErrors };

export function validateHouseInput(input: HouseFormInput): ValidationResult {
  const parsed = schema.safeParse({
    street: input.street,
    houseNumber: input.houseNumber,
    apartment: input.apartment,
    floor: input.floor,
    buildingCode: input.buildingCode,
    notes: input.notes,
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
  const { street, houseNumber, apartment, floor, buildingCode, notes, location } = parsed.data;
  return {
    ok: true,
    value: {
      street,
      house_number: houseNumber,
      apartment: apartment || null,
      floor: floor || null,
      building_code: buildingCode || null,
      notes: notes || null,
      lat: location.lat!,
      lng: location.lng!,
    },
  };
}
