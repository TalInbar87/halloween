import { describe, it, expect } from 'vitest';
import { validateHouseInput } from './validation';

const valid = {
  address: 'הרצל 10, ראשון לציון',
  apartment: '',
  floor: '',
  notes: '',
  pin: '1234',
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

  it('requires a 4-digit removal code', () => {
    for (const pin of ['', '123', '12345', 'abcd', '12 4']) {
      const r = validateHouseInput({ ...valid, pin });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.pin).toBeDefined();
    }
  });

  it('passes the removal code through', () => {
    const r = validateHouseInput({ ...valid, pin: '0420' });
    expect(r.ok && r.value.pin).toBe('0420');
  });

  it('accepts a valid house and trims text', () => {
    const r = validateHouseInput({ ...valid, address: '  הרצל 10  ', notes: '  ממתקים בלי בוטנים ' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.address).toBe('הרצל 10');
      expect(r.value.notes).toBe('ממתקים בלי בוטנים');
    }
  });

  it('turns empty notes into null', () => {
    const r = validateHouseInput(valid);
    expect(r.ok && r.value.notes).toBe(null);
  });

  it('requires an address of at least 3 characters', () => {
    const r = validateHouseInput({ ...valid, address: ' א ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.address).toBeDefined();
  });

  it('caps address length', () => {
    const r = validateHouseInput({ ...valid, address: 'א'.repeat(201) });
    expect(r.ok).toBe(false);
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
    const r = validateHouseInput({ ...valid, address: 'הרצל\u0000 10' });
    expect(r.ok).toBe(false);
  });
});
