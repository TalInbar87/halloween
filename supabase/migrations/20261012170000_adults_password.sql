-- One shared "adults password" for adding and removing houses, replacing the
-- per-house 4-digit removal code and the per-device removal token.
--
-- The password itself is NOT in this file (the repo is public). Set it once in
-- the Supabase SQL editor:
--
--   insert into public.app_secret (id, password_hash)
--   values (1, extensions.crypt('<the password>', extensions.gen_salt('bf', 10)))
--   on conflict (id) do update set password_hash = excluded.password_hash;
--
-- Wrong guesses are capped at 10 per IP per hour and 50 overall per hour.

drop function if exists public.remove_house_with_pin(uuid, text);
drop function if exists public.remove_house(uuid, text);
drop function if exists public.add_house(text, text, text, text, double precision, double precision, text);
drop table if exists public.remove_attempts;

alter table public.houses
  drop column if exists remove_pin_hash,
  drop column if exists delete_token_hash;

create table public.app_secret (
  id            int primary key default 1 check (id = 1),
  password_hash text not null
);
alter table public.app_secret enable row level security;
revoke all on public.app_secret from anon, authenticated;

create table public.auth_failures (
  id         bigint generated always as identity primary key,
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index auth_failures_recent_idx on public.auth_failures (created_at, ip_hash);
alter table public.auth_failures enable row level security;
revoke all on public.auth_failures from anon, authenticated;

-- 'ok' | 'wrong_password' | 'not_configured'. Records failures (so callers must
-- RETURN, not RAISE, on failure — a raise would roll the record back).
create or replace function public._check_adult_password(p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip   text := public._client_ip_hash();
  v_hash text;
begin
  if v_ip is not null and (
       select count(*) from public.auth_failures f
       where f.ip_hash = v_ip and f.created_at > now() - interval '1 hour'
     ) >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.auth_failures f where f.created_at > now() - interval '1 hour') >= 50 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select s.password_hash into v_hash from public.app_secret s where s.id = 1;
  if v_hash is null then
    return 'not_configured';
  end if;

  if p_password is not null and char_length(p_password) <= 100
     and v_hash = extensions.crypt(p_password, v_hash) then
    return 'ok';
  end if;

  insert into public.auth_failures (ip_hash) values (v_ip);
  return 'wrong_password';
end;
$$;
revoke all on function public._check_adult_password(text) from public, anon, authenticated;

create or replace function public.add_house(
  p_password  text,
  p_address   text,
  p_apartment text,
  p_floor     text,
  p_notes     text,
  p_lat       double precision,
  p_lng       double precision
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth      text := public._check_adult_password(p_password);
  v_address   text := btrim(coalesce(p_address, ''));
  v_apartment text := nullif(btrim(coalesce(p_apartment, '')), '');
  v_floor     text := nullif(btrim(coalesce(p_floor, '')), '');
  v_notes     text := nullif(btrim(coalesce(p_notes, '')), '');
  v_ip        text := public._client_ip_hash();
  v_id        uuid;
begin
  if v_auth <> 'ok' then
    return jsonb_build_object('ok', false, 'error', v_auth);
  end if;

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

  -- Abuse limits (still useful if the password leaks).
  if (select count(*) from public.houses) >= 500 then
    raise exception 'map_full' using errcode = 'P0001';
  end if;
  if (select count(*) from public.houses h where h.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.houses h
    where lower(h.address) = lower(v_address)
      and lower(coalesce(h.apartment, '')) = lower(coalesce(v_apartment, ''))
  ) then
    raise exception 'duplicate_house' using errcode = 'P0001';
  end if;

  insert into public.houses (address, apartment, floor, notes, lat, lng, client_ip_hash)
  values (v_address, v_apartment, v_floor, v_notes, p_lat, p_lng, v_ip)
  returning houses.id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.remove_house(p_id uuid, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth text := public._check_adult_password(p_password);
begin
  if v_auth <> 'ok' then
    return jsonb_build_object('ok', false, 'error', v_auth);
  end if;
  delete from public.houses h where h.id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.add_house(text, text, text, text, text, double precision, double precision) from public;
revoke all on function public.remove_house(uuid, text) from public;
grant execute on function public.add_house(text, text, text, text, text, double precision, double precision) to anon, authenticated;
grant execute on function public.remove_house(uuid, text) to anon, authenticated;
