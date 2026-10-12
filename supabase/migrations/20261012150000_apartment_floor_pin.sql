-- Apartment + floor, and a 4-digit removal code so owners can remove their
-- house from any device (not just the one that added it).
--
-- The code is stored bcrypt-hashed. Guessing is capped: 10 wrong codes per IP
-- per hour, and 20 wrong codes per house per day (after which removal by code
-- for that house pauses until the next day).

alter table public.houses
  add column apartment       text check (apartment is null or char_length(apartment) <= 10),
  add column floor           text check (floor is null or char_length(floor) <= 10),
  add column remove_pin_hash text;

grant select (apartment, floor) on public.houses to anon, authenticated;

create table public.remove_attempts (
  id         bigint generated always as identity primary key,
  house_id   uuid not null,
  ip_hash    text,
  created_at timestamptz not null default now()
);

create index remove_attempts_house_idx on public.remove_attempts (house_id, created_at);
create index remove_attempts_ip_idx on public.remove_attempts (ip_hash, created_at);

alter table public.remove_attempts enable row level security;
revoke all on public.remove_attempts from anon, authenticated;

-- Replace add_house with the new signature.
drop function if exists public.add_house(text, text, double precision, double precision);

create or replace function public.add_house(
  p_address   text,
  p_apartment text,
  p_floor     text,
  p_notes     text,
  p_lat       double precision,
  p_lng       double precision,
  p_pin       text
)
returns table (id uuid, delete_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_address   text := btrim(coalesce(p_address, ''));
  v_apartment text := nullif(btrim(coalesce(p_apartment, '')), '');
  v_floor     text := nullif(btrim(coalesce(p_floor, '')), '');
  v_notes     text := nullif(btrim(coalesce(p_notes, '')), '');
  v_ip        text := public._client_ip_hash();
  v_token     text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id        uuid;
begin
  -- Input validation (mirrors src/lib/validation.ts; never trust the client).
  if char_length(v_address) < 3 or char_length(v_address) > 200 or v_address ~ '[[:cntrl:]]' then
    raise exception 'invalid_address' using errcode = '22023';
  end if;
  if v_apartment is not null and (char_length(v_apartment) > 10 or v_apartment ~ '[[:cntrl:]]') then
    raise exception 'invalid_apartment' using errcode = '22023';
  end if;
  if v_floor is not null and (char_length(v_floor) > 10 or v_floor ~ '[[:cntrl:]]') then
    raise exception 'invalid_floor' using errcode = '22023';
  end if;
  if v_notes is not null and (char_length(v_notes) > 200 or v_notes ~ '[[:cntrl:]]') then
    raise exception 'invalid_notes' using errcode = '22023';
  end if;
  if p_lat is null or p_lng is null
     or p_lat not between 29.4 and 33.4 or p_lng not between 34.2 and 35.95 then
    raise exception 'invalid_location' using errcode = '22023';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'invalid_pin' using errcode = '22023';
  end if;

  -- Abuse limits.
  if (select count(*) from public.houses) >= 500 then
    raise exception 'map_full' using errcode = 'P0001';
  end if;
  if (select count(*) from public.houses h where h.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if v_ip is not null and (
       select count(*) from public.houses h
       where h.client_ip_hash = v_ip and h.created_at > now() - interval '1 hour'
     ) >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- Same address + same apartment. (Apartments in one building share a pin, so
  -- pin proximity is no longer treated as a duplicate.)
  if exists (
    select 1 from public.houses h
    where lower(h.address) = lower(v_address)
      and lower(coalesce(h.apartment, '')) = lower(coalesce(v_apartment, ''))
  ) then
    raise exception 'duplicate_house' using errcode = 'P0001';
  end if;

  insert into public.houses
    (address, apartment, floor, notes, lat, lng, delete_token_hash, remove_pin_hash, client_ip_hash)
  values
    (v_address, v_apartment, v_floor, v_notes, p_lat, p_lng,
     encode(extensions.digest(v_token, 'sha256'), 'hex'),
     extensions.crypt(p_pin, extensions.gen_salt('bf', 8)),
     v_ip)
  returning houses.id into v_id;

  return query select v_id, v_token;
end;
$$;

create or replace function public.remove_house_with_pin(p_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip   text := public._client_ip_hash();
  v_hash text;
begin
  if v_ip is not null and (
       select count(*) from public.remove_attempts a
       where a.ip_hash = v_ip and a.created_at > now() - interval '1 hour'
     ) >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (
       select count(*) from public.remove_attempts a
       where a.house_id = p_id and a.created_at > now() - interval '1 day'
     ) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select h.remove_pin_hash into v_hash from public.houses h where h.id = p_id;

  if v_hash is not null and p_pin ~ '^[0-9]{4}$' and v_hash = extensions.crypt(p_pin, v_hash) then
    delete from public.houses h where h.id = p_id;
    delete from public.remove_attempts a where a.house_id = p_id;
    return true;
  end if;

  insert into public.remove_attempts (house_id, ip_hash) values (p_id, v_ip);
  return false;
end;
$$;

revoke all on function public.add_house(text, text, text, text, double precision, double precision, text) from public;
revoke all on function public.remove_house_with_pin(uuid, text) from public;
grant execute on function public.add_house(text, text, text, text, double precision, double precision, text) to anon, authenticated;
grant execute on function public.remove_house_with_pin(uuid, text) to anon, authenticated;
