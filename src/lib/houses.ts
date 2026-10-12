import type { SupabaseClient } from '@supabase/supabase-js';
import type { House, NewHouse } from './types';

// Anonymous visitors can only read these columns. Adding and removing go through
// SQL functions that check the adults password and rate-limit (see supabase/migrations).
const PUBLIC_COLUMNS = 'id,address,apartment,floor,lat,lng,notes,created_at';

type RpcResult = { ok?: boolean; error?: string; id?: string } | null;

export async function fetchHouses(client: SupabaseClient): Promise<House[]> {
  const { data, error } = await client.from('houses').select(PUBLIC_COLUMNS).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as House[];
}

/** Returns the new house id. Throws `wrong_password`, `duplicate_house`, `rate_limited`, … */
export async function addHouse(client: SupabaseClient, house: NewHouse, password: string): Promise<string> {
  const { data, error } = await client.rpc('add_house', {
    p_password: password,
    p_address: house.address,
    p_apartment: house.apartment,
    p_floor: house.floor,
    p_notes: house.notes,
    p_lat: house.lat,
    p_lng: house.lng,
  });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result?.ok || !result.id) throw new Error(result?.error ?? 'empty_response');
  return result.id;
}

export async function removeHouse(client: SupabaseClient, id: string, password: string): Promise<void> {
  const { data, error } = await client.rpc('remove_house', { p_id: id, p_password: password });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result?.ok) throw new Error(result?.error ?? 'empty_response');
}

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg.includes('wrong_password')) return 'סיסמה שגויה';
  if (msg.includes('rate_limited')) return 'נשלחו יותר מדי בקשות. נסו שוב בעוד כמה דקות.';
  if (msg.includes('duplicate_house')) return 'הבית הזה כבר מופיע במפה.';
  if (msg.includes('map_full')) return 'המפה מלאה כרגע. פנו למארגנים.';
  return 'משהו השתבש. נסו שוב.';
}
