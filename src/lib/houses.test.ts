import { describe, it, expect, vi } from 'vitest';
import { fetchHouses, addHouse, updateHouse, removeHouse, verifyPassword, friendlyError } from './houses';
import type { SupabaseClient } from '@supabase/supabase-js';

function clientWith(overrides: { select?: unknown; rpc?: unknown }) {
  const order = vi.fn().mockResolvedValue(overrides.select);
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn().mockResolvedValue(overrides.rpc);
  return { client: { from, rpc } as unknown as SupabaseClient, from, select, rpc };
}

describe('fetchHouses', () => {
  it('selects only public columns', async () => {
    const { client, select } = clientWith({ select: { data: [], error: null } });
    await fetchHouses(client);
    expect(select).toHaveBeenCalledWith('id,address,apartment,floor,building_code,lat,lng,notes,created_at');
  });

  it('returns rows', async () => {
    const row = { id: '1', address: 'a', apartment: null, floor: null, building_code: null, lat: 32, lng: 34.8, notes: null, created_at: 'x' };
    const { client } = clientWith({ select: { data: [row], error: null } });
    expect(await fetchHouses(client)).toEqual([row]);
  });

  it('throws on error', async () => {
    const { client } = clientWith({ select: { data: null, error: { message: 'boom' } } });
    await expect(fetchHouses(client)).rejects.toThrow();
  });
});

describe('addHouse', () => {
  const input = { address: 'הרצל 10', apartment: '4', floor: '2', building_code: '12#', notes: null, lat: 31.96, lng: 34.8 };

  it('calls add_house with the adults password and returns the id', async () => {
    const { client, rpc } = clientWith({ rpc: { data: { ok: true, id: 'h1' }, error: null } });
    expect(await addHouse(client, input, 'secret')).toBe('h1');
    expect(rpc).toHaveBeenCalledWith('add_house', {
      p_password: 'secret',
      p_address: 'הרצל 10',
      p_apartment: '4',
      p_floor: '2',
      p_building_code: '12#',
      p_notes: null,
      p_lat: 31.96,
      p_lng: 34.8,
    });
  });

  it('throws wrong_password when the password is rejected', async () => {
    const { client } = clientWith({ rpc: { data: { ok: false, error: 'wrong_password' }, error: null } });
    await expect(addHouse(client, input, 'nope')).rejects.toThrow('wrong_password');
  });

  it('throws when the RPC fails', async () => {
    const { client } = clientWith({ rpc: { data: null, error: { message: 'rate_limited' } } });
    await expect(addHouse(client, input, 'secret')).rejects.toThrow('rate_limited');
  });

  it('throws when the RPC returns nothing', async () => {
    const { client } = clientWith({ rpc: { data: null, error: null } });
    await expect(addHouse(client, input, 'secret')).rejects.toThrow();
  });
});

describe('updateHouse', () => {
  const input = { address: 'הרצל 12', apartment: null, floor: '1', building_code: null, notes: 'x', lat: 31.97, lng: 34.81 };

  it('calls update_house with the id and adults password', async () => {
    const { client, rpc } = clientWith({ rpc: { data: { ok: true, id: 'h1' }, error: null } });
    await updateHouse(client, 'h1', input, 'secret');
    expect(rpc).toHaveBeenCalledWith('update_house', {
      p_password: 'secret',
      p_id: 'h1',
      p_address: 'הרצל 12',
      p_apartment: null,
      p_floor: '1',
      p_building_code: null,
      p_notes: 'x',
      p_lat: 31.97,
      p_lng: 34.81,
    });
  });

  it('throws the server error', async () => {
    const { client } = clientWith({ rpc: { data: { ok: false, error: 'not_found' }, error: null } });
    await expect(updateHouse(client, 'h1', input, 'secret')).rejects.toThrow('not_found');
  });

  it('throws on RPC error', async () => {
    const { client } = clientWith({ rpc: { data: null, error: { message: 'duplicate_house' } } });
    await expect(updateHouse(client, 'h1', input, 'secret')).rejects.toThrow('duplicate_house');
  });
});

describe('removeHouse', () => {
  it('calls remove_house with the adults password', async () => {
    const { client, rpc } = clientWith({ rpc: { data: { ok: true }, error: null } });
    await removeHouse(client, 'h1', 'secret');
    expect(rpc).toHaveBeenCalledWith('remove_house', { p_id: 'h1', p_password: 'secret' });
  });

  it('throws wrong_password when rejected', async () => {
    const { client } = clientWith({ rpc: { data: { ok: false, error: 'wrong_password' }, error: null } });
    await expect(removeHouse(client, 'h1', 'nope')).rejects.toThrow('wrong_password');
  });

  it('throws on RPC error', async () => {
    const { client } = clientWith({ rpc: { data: null, error: { message: 'rate_limited' } } });
    await expect(removeHouse(client, 'h1', 'secret')).rejects.toThrow('rate_limited');
  });
});

describe('verifyPassword', () => {
  it('resolves when the password is right', async () => {
    const { client, rpc } = clientWith({ rpc: { data: { ok: true }, error: null } });
    await verifyPassword(client, 'secret');
    expect(rpc).toHaveBeenCalledWith('verify_adult_password', { p_password: 'secret' });
  });

  it('throws wrong_password when rejected', async () => {
    const { client } = clientWith({ rpc: { data: { ok: false, error: 'wrong_password' }, error: null } });
    await expect(verifyPassword(client, 'nope')).rejects.toThrow('wrong_password');
  });

  it('throws on RPC error', async () => {
    const { client } = clientWith({ rpc: { data: null, error: { message: 'rate_limited' } } });
    await expect(verifyPassword(client, 'x')).rejects.toThrow('rate_limited');
  });
});

describe('friendlyError', () => {
  it('maps a wrong password to Hebrew', () => {
    expect(friendlyError(new Error('wrong_password'))).toBe('סיסמה שגויה');
  });

  it('maps rate limiting to Hebrew', () => {
    expect(friendlyError(new Error('rate_limited'))).toMatch(/יותר מדי/);
  });

  it('maps duplicates to Hebrew', () => {
    expect(friendlyError(new Error('duplicate_house'))).toMatch(/כבר/);
  });

  it('maps a full map to Hebrew', () => {
    expect(friendlyError(new Error('map_full'))).toMatch(/מלאה/);
  });

  it('falls back to a generic message without leaking details', () => {
    const msg = friendlyError(new Error('relation "secret" does not exist'));
    expect(msg).not.toMatch(/secret/);
  });
});
