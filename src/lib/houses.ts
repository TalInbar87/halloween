import type { SupabaseClient } from '@supabase/supabase-js';
import type { House, NewHouse } from './types';

// The houses table isn't readable through the API at all: the list comes only from
// list_houses(), which checks the neighbourhood password. Adding and removing go
// through SQL functions that check the adults password (see supabase/migrations).

type RpcResult = { ok?: boolean; error?: string; id?: string; houses?: House[] | null } | null;

/** Throws `wrong_password`, `rate_limited`, … */
export async function fetchHouses(client: SupabaseClient, password: string): Promise<House[]> {
  const { data, error } = await client.rpc('list_houses', { p_password: password });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result?.ok) throw new Error(result?.error ?? 'empty_response');
  return result.houses ?? [];
}

/** Returns the new house id. Throws `wrong_password`, `duplicate_house`, `rate_limited`, … */
export async function addHouse(client: SupabaseClient, house: NewHouse, password: string): Promise<string> {
  const { data, error } = await client.rpc('add_house', {
    p_password: password,
    p_street: house.street,
    p_house_number: house.house_number,
    p_apartment: house.apartment,
    p_floor: house.floor,
    p_building_code: house.building_code,
    p_notes: house.notes,
    p_lat: house.lat,
    p_lng: house.lng,
  });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result?.ok || !result.id) throw new Error(result?.error ?? 'empty_response');
  return result.id;
}

/** Replaces an existing house's details and pin. Throws `wrong_password`, `not_found`, `duplicate_house`, … */
export async function updateHouse(client: SupabaseClient, id: string, house: NewHouse, password: string): Promise<void> {
  const { data, error } = await client.rpc('update_house', {
    p_password: password,
    p_id: id,
    p_street: house.street,
    p_house_number: house.house_number,
    p_apartment: house.apartment,
    p_floor: house.floor,
    p_building_code: house.building_code,
    p_notes: house.notes,
    p_lat: house.lat,
    p_lng: house.lng,
  });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result?.ok) throw new Error(result?.error ?? 'empty_response');
}

/** Adults mark a house as out of candy for tonight (or back). */
export async function setOutOfCandy(client: SupabaseClient, id: string, out: boolean, password: string): Promise<void> {
  const { data, error } = await client.rpc('set_out_of_candy', { p_password: password, p_id: id, p_out: out });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result?.ok) throw new Error(result?.error ?? 'empty_response');
}

export async function removeHouse(client: SupabaseClient, id: string, password: string): Promise<void> {
  const { data, error } = await client.rpc('remove_house', { p_id: id, p_password: password });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result?.ok) throw new Error(result?.error ?? 'empty_response');
}

/** Checks the adults password before opening the admin panel. Throws `wrong_password`, `rate_limited`, … */
export async function verifyPassword(client: SupabaseClient, password: string): Promise<void> {
  const { data, error } = await client.rpc('verify_adult_password', { p_password: password });
  if (error) throw new Error(error.message);
  const result = data as RpcResult;
  if (!result?.ok) throw new Error(result?.error ?? 'empty_response');
}

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg.includes('wrong_password')) return 'סיסמה שגויה';
  if (msg.includes('rate_limited')) return 'נשלחו יותר מדי בקשות. נסו שוב בעוד כמה דקות.';
  if (msg.includes('duplicate_house')) return 'הבית הזה כבר מופיע במפה.';
  if (msg.includes('not_found')) return 'הבית כבר לא קיים במפה.';
  if (msg.includes('map_full')) return 'המפה מלאה כרגע. פנו למארגנים.';
  return 'משהו השתבש. נסו שוב.';
}
