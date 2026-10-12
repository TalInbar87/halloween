import type { SupabaseClient } from '@supabase/supabase-js';
import type { House, NewHouse } from './types';

// Anonymous visitors can only read these columns; writes go through SQL functions
// that validate input and rate-limit (see supabase/migrations).
const PUBLIC_COLUMNS = 'id,address,lat,lng,notes,created_at';

export async function fetchHouses(client: SupabaseClient): Promise<House[]> {
  const { data, error } = await client.from('houses').select(PUBLIC_COLUMNS).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as House[];
}

export async function addHouse(client: SupabaseClient, house: NewHouse): Promise<{ id: string; deleteToken: string }> {
  const { data, error } = await client.rpc('add_house', {
    p_address: house.address,
    p_notes: house.notes,
    p_lat: house.lat,
    p_lng: house.lng,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id || !row?.delete_token) throw new Error('empty_response');
  return { id: row.id, deleteToken: row.delete_token };
}

export async function removeHouse(client: SupabaseClient, id: string, token: string): Promise<boolean> {
  const { data, error } = await client.rpc('remove_house', { p_id: id, p_token: token });
  if (error) throw new Error(error.message);
  return data === true;
}

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg.includes('rate_limited')) return 'נשלחו יותר מדי בקשות. נסו שוב בעוד כמה דקות.';
  if (msg.includes('duplicate_house')) return 'הבית הזה כבר מופיע במפה.';
  if (msg.includes('map_full')) return 'המפה מלאה כרגע. פנו למארגנים.';
  return 'משהו השתבש. נסו שוב.';
}
