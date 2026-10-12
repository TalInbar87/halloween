-- Halloween neighbourhood map: houses giving out candy.
--
-- Security model
--   * Anyone (anon) may READ the public columns.
--   * Nobody may write the table directly. Adding/removing goes through the two
--     SECURITY DEFINER functions below, which validate input, rate-limit by
--     (hashed) client IP, and require a secret token to remove a house.
--   * Raw IPs and removal tokens are never stored; only SHA-256 hashes.
--   * Admin cleanup: delete rows from the Supabase dashboard (service role).

create extension if not exists pgcrypto with schema extensions;

create table public.houses (
  id                uuid primary key default gen_random_uuid(),
  address           text not null check (char_length(address) between 3 and 200),
  notes             text check (notes is null or char_length(notes) <= 200),
  lat               double precision not null check (lat between 29.4 and 33.4),
  lng               double precision not null check (lng between 34.2 and 35.95),
  created_at        timestamptz not null default now(),
  delete_token_hash text not null,
  client_ip_hash    text
);

create index houses_created_at_idx on public.houses (created_at);
create index houses_ip_recent_idx on public.houses (client_ip_hash, created_at);

alter table public.houses enable row level security;

-- Supabase grants everything to anon/authenticated by default; take it back and
-- expose only the public columns.
revoke all on public.houses from anon, authenticated;
grant select (id, address, lat, lng, notes, created_at) on public.houses to anon, authenticated;

create policy "houses are publicly readable"
  on public.houses for select
  to anon, authenticated
  using (true);

-- Hash of the caller's IP as seen by the API gateway (null if unavailable).
create or replace function public._client_ip_hash()
returns text
language sql
stable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      split_part(
        coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
        ',', 1
      ) || ':halloween',
      'sha256'
    ),
    'hex'
  )
  where coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', '') <> '';
$$;

revoke all on function public._client_ip_hash() from public, anon, authenticated;

create or replace function public.add_house(
  p_address text,
  p_notes   text,
  p_lat     double precision,
  p_lng     double precision
)
returns table (id uuid, delete_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_address text := btrim(coalesce(p_address, ''));
  v_notes   text := nullif(btrim(coalesce(p_notes, '')), '');
  v_ip      text := public._client_ip_hash();
  v_token   text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id      uuid;
begin
  -- Input validation (mirrors src/lib/validation.ts; never trust the client).
  if char_length(v_address) < 3 or char_length(v_address) > 200
     or v_address ~ '[[:cntrl:]]' then
    raise exception 'invalid_address' using errcode = '22023';
  end if;
  if v_notes is not null and (char_length(v_notes) > 200 or v_notes ~ '[[:cntrl:]]') then
    raise exception 'invalid_notes' using errcode = '22023';
  end if;
  if p_lat is null or p_lng is null
     or p_lat not between 29.4 and 33.4 or p_lng not between 34.2 and 35.95 then
    raise exception 'invalid_location' using errcode = '22023';
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

  -- Same address text, or a pin within ~5m of an existing one.
  if exists (
    select 1 from public.houses h
    where lower(h.address) = lower(v_address)
       or (abs(h.lat - p_lat) < 0.00005 and abs(h.lng - p_lng) < 0.00005)
  ) then
    raise exception 'duplicate_house' using errcode = 'P0001';
  end if;

  insert into public.houses (address, notes, lat, lng, delete_token_hash, client_ip_hash)
  values (v_address, v_notes, p_lat, p_lng,
          encode(extensions.digest(v_token, 'sha256'), 'hex'), v_ip)
  returning houses.id into v_id;

  return query select v_id, v_token;
end;
$$;

create or replace function public.remove_house(p_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.houses h
  where h.id = p_id
    and h.delete_token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  return found;
end;
$$;

revoke all on function public.add_house(text, text, double precision, double precision) from public;
revoke all on function public.remove_house(uuid, text) from public;
grant execute on function public.add_house(text, text, double precision, double precision) to anon, authenticated;
grant execute on function public.remove_house(uuid, text) to anon, authenticated;
