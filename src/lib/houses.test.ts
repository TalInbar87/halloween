import { describe, it, expect, vi } from 'vitest';
import { fetchHouses, addHouse, removeHouse, removeHouseWithPin, friendlyError } from './houses';
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
    expect(select).toHaveBeenCalledWith('id,address,apartment,floor,lat,lng,notes,created_at');
  });

  it('returns rows', async () => {
    const row = { id: '1', address: 'a', lat: 32, lng: 34.8, notes: null, created_at: 'x' };
    const { client } = clientWith({ select: { data: [row], error: null } });
    expect(await fetchHouses(client)).toEqual([row]);
  });

  it('throws on error', async () => {
    const { client } = clientWith({ select: { data: null, error: { message: 'boom' } } });
    await expect(fetchHouses(client)).rejects.toThrow();
  });
});

describe('addHouse', () => {
  const input = { address: 'הרצל 10', apartment: '4', floor: '2', notes: null, lat: 31.96, lng: 34.8, pin: '1234' };

  it('calls the add_house RPC and returns id + token', async () => {
    const { client, rpc } = clientWith({ rpc: { data: [{ id: 'h1', delete_token: 't1' }], error: null } });
    expect(await addHouse(client, input)).toEqual({ id: 'h1', deleteToken: 't1' });
    expect(rpc).toHaveBeenCalledWith('add_house', {
      p_address: 'הרצל 10',
      p_apartment: '4',
      p_floor: '2',
      p_notes: null,
      p_lat: 31.96,
      p_lng: 34.8,
      p_pin: '1234',
    });
  });

  it('throws when the RPC fails', async () => {
    const { client } = clientWith({ rpc: { data: null, error: { message: 'rate_limited' } } });
    await expect(addHouse(client, input)).rejects.toThrow('rate_limited');
  });

  it('throws when the RPC returns nothing', async () => {
    const { client } = clientWith({ rpc: { data: [], error: null } });
    await expect(addHouse(client, input)).rejects.toThrow();
  });
});

describe('removeHouse', () => {
  it('returns true when the house was removed', async () => {
    const { client, rpc } = clientWith({ rpc: { data: true, error: null } });
    expect(await removeHouse(client, 'h1', 't1')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('remove_house', { p_id: 'h1', p_token: 't1' });
  });

  it('throws on error', async () => {
    const { client } = clientWith({ rpc: { data: null, error: { message: 'x' } } });
    await expect(removeHouse(client, 'h1', 't1')).rejects.toThrow();
  });
});

describe('removeHouseWithPin', () => {
  it('calls remove_house_with_pin and returns the result', async () => {
    const { client, rpc } = clientWith({ rpc: { data: false, error: null } });
    expect(await removeHouseWithPin(client, 'h1', '9999')).toBe(false);
    expect(rpc).toHaveBeenCalledWith('remove_house_with_pin', { p_id: 'h1', p_pin: '9999' });
  });

  it('throws on error', async () => {
    const { client } = clientWith({ rpc: { data: null, error: { message: 'rate_limited' } } });
    await expect(removeHouseWithPin(client, 'h1', '1234')).rejects.toThrow('rate_limited');
  });
});

describe('friendlyError', () => {
  it('maps rate limiting to Hebrew', () => {
    expect(friendlyError(new Error('rate_limited'))).toMatch(/יותר מדי/);
  });

  it('maps duplicates to Hebrew', () => {
    expect(friendlyError(new Error('duplicate_house'))).toMatch(/כבר/);
  });

  it('falls back to a generic message without leaking details', () => {
    const msg = friendlyError(new Error('relation "secret" does not exist'));
    expect(msg).not.toMatch(/secret/);
  });
});
