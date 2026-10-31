import { describe, it, expect } from 'vitest';
import { buildWhatsAppList } from './whatsappList';
import type { House } from './types';

const house = (id: string, address: string, over: Partial<House> = {}): House => ({
  id,
  address,
  street: null,
  house_number: null,
  apartment: null,
  floor: null,
  building_code: null,
  out_of_candy: false,
  lat: 32.05,
  lng: 34.858,
  notes: null,
  created_at: 'x',
  ...over,
});

describe('buildWhatsAppList', () => {
  it('starts with a bold title and the house count', () => {
    const lines = buildWhatsAppList([house('a', 'יפה נוף 38'), house('b', 'אלון 3')]).split('\n');
    expect(lines[0]).toBe('*🎃 מפת הממתקים של השכונה*');
    expect(lines[1]).toBe('2 בתים');
  });

  it('puts each address in bold, sorted, with number order (9 before 10)', () => {
    const text = buildWhatsAppList([house('a', 'נהר הירדן 10'), house('b', 'נהר הירדן 9'), house('c', 'אלון 3')]);
    expect(text.indexOf('*אלון 3*')).toBeLessThan(text.indexOf('*נהר הירדן 9*'));
    expect(text.indexOf('*נהר הירדן 9*')).toBeLessThan(text.indexOf('*נהר הירדן 10*'));
  });

  it('lists apartments of one building under one address', () => {
    const text = buildWhatsAppList([
      house('a', 'נהר הירדן 27', { apartment: '12', floor: '2', building_code: '1044' }),
      house('b', 'נהר הירדן 27', { apartment: '29', floor: '7' }),
    ]);
    expect(text.match(/\*נהר הירדן 27\*/g)).toHaveLength(1);
    expect(text).toContain('• דירה 12, קומה 2, קוד בניין 1044');
    expect(text).toContain('• דירה 29, קומה 7');
  });

  it('adds notes, and no empty bullet for a private house', () => {
    const text = buildWhatsAppList([
      house('a', 'יפה נוף 38'),
      house('b', 'אלון 3', { notes: 'בלי בוטנים' }),
    ]);
    expect(text).toMatch(/^\*יפה נוף 38\*$/m);
    expect(text).not.toMatch(/•\s*\n/);
    expect(text).toContain('• בלי בוטנים');
  });

  it('leaves out houses that ran out of candy', () => {
    const text = buildWhatsAppList([house('a', 'יפה נוף 38', { out_of_candy: true }), house('b', 'אלון 3')]);
    expect(text).not.toContain('יפה נוף 38');
    expect(text).toContain('בית אחד');
  });
});
