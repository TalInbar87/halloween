import { addressKey, sortByAddress, unitDetails } from './houseList';
import type { House } from './types';

/**
 * The house list as a WhatsApp message (*bold* titles), for kids without a smartphone:
 * an adult sends it and they read it on a basic phone. Houses out of candy are left out.
 */
export function buildWhatsAppList(houses: House[]): string {
  const open = sortByAddress(houses.filter((h) => !h.out_of_candy));
  const count = open.length === 1 ? 'בית אחד' : `${open.length} בתים`;

  const blocks: string[] = [];
  let lastKey: string | null = null;
  for (const h of open) {
    const key = addressKey(h.address);
    if (key !== lastKey) blocks.push(`\n*${h.address}*`);
    lastKey = key;
    const details = unitDetails(h);
    const line = details && h.notes ? `${details} (${h.notes})` : details || h.notes;
    if (line) blocks.push(`• ${line}`);
  }

  return ['*🎃 מפת הממתקים של השכונה*', count, ...blocks].join('\n');
}
