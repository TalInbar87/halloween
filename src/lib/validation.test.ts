import { describe, it, expect } from 'vitest';
import { validateHouseInput } from './validation';

const valid = {
  street: 'נהר הירדן',
  houseNumber: '27',
  apartment: '',
  floor: '',
  buildingCode: '',
  notes: '',
  lat: 31.96,
  lng: 34.8,
  consent: true,
};

describe('validateHouseInput', () => {
  it('turns empty apartment and floor into null', () => {
    const r = validateHouseInput(valid);
    expect(r.ok && r.value.apartment).toBe(null);
    expect(r.ok && r.value.floor).toBe(null);
  });

  it('keeps trimmed apartment and floor', () => {
    const r = validateHouseInput({ ...valid, apartment: ' 4א ', floor: ' 2 ' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.apartment).toBe('4א');
      expect(r.value.floor).toBe('2');
    }
  });

  it('caps apartment and floor length', () => {
    const r = validateHouseInput({ ...valid, apartment: '12345678901', floor: '12345678901' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.apartment).toBeDefined();
      expect(r.errors.floor).toBeDefined();
    }
  });

  it('turns an empty building code into null', () => {
    const r = validateHouseInput(valid);
    expect(r.ok && r.value.building_code).toBe(null);
  });

  it('keeps a trimmed building code and caps its length', () => {
    const ok = validateHouseInput({ ...valid, buildingCode: ' 1234# ' });
    expect(ok.ok && ok.value.building_code).toBe('1234#');
    const long = validateHouseInput({ ...valid, buildingCode: 'x'.repeat(21) });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.errors.buildingCode).toBeDefined();
  });

  it('turns empty notes into null', () => {
    const r = validateHouseInput(valid);
    expect(r.ok && r.value.notes).toBe(null);
  });

  it('passes street and number through, trimmed', () => {
    const r = validateHouseInput({ ...valid, street: '  נהר  הירדן ', houseNumber: ' 27א ' });
    expect(r.ok && r.value.street).toBe('נהר הירדן');
    expect(r.ok && r.value.house_number).toBe('27א');
  });

  it('requires a street of at least 2 characters', () => {
    const r = validateHouseInput({ ...valid, street: ' א ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.street).toBe('נא להזין רחוב');
  });

  it('caps street length', () => {
    const r = validateHouseInput({ ...valid, street: 'א'.repeat(101) });
    expect(r.ok).toBe(false);
  });

  it.each(['', 'אבג', '12345', '27-29'])('rejects house number %j', (houseNumber) => {
    const r = validateHouseInput({ ...valid, houseNumber });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.houseNumber).toBeDefined();
  });

  it.each(['5', '27', '27א', '1234'])('accepts house number %j', (houseNumber) => {
    expect(validateHouseInput({ ...valid, houseNumber }).ok).toBe(true);
  });

  it('caps notes length', () => {
    const r = validateHouseInput({ ...valid, notes: 'א'.repeat(201) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.notes).toBeDefined();
  });

  it('requires a pin location', () => {
    const r = validateHouseInput({ ...valid, lat: null, lng: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.location).toBeDefined();
  });

  it('rejects a pin outside the service area', () => {
    const r = validateHouseInput({ ...valid, lat: 48.85, lng: 2.35 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.location).toBeDefined();
  });

  it('requires consent', () => {
    const r = validateHouseInput({ ...valid, consent: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.consent).toBeDefined();
  });

  it('rejects control characters in text', () => {
    const r = validateHouseInput({ ...valid, street: 'נהר\u0000 הירדן' });
    expect(r.ok).toBe(false);
  });
});
