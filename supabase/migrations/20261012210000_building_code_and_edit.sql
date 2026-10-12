-- Optional building entry code, and editing an existing house (adults only).

alter table public.houses
  add column building_code text check (building_code is null or char_length(building_code) <= 20);

grant select (building_code) on public.houses to anon, authenticated;

-- Shared validation for add + update. Raises on bad input.
create or replace function public._validate_house(
  p_address text, p_apartment text, p_floor text, p_building_code text, p_notes text,
  p_lat double precision, p_lng double precision
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_address is null or char_length(p_address) < 3 or char_length(p_address) > 200 or p_address ~ '[[:cntrl:]]' then
    raise exception 'invalid_address' using errcode = '22023';
  end if;
  if p_apartment is not null and (char_length(p_apartment) > 10 or p_apartment ~ '[[:cntrl:]]') then
    raise exception 'invalid_apartment' using errcode = '22023';
  end if;
  if p_floor is not null and (char_length(p_floor) > 10 or p_floor ~ '[[:cntrl:]]') then
    raise exception 'invalid_floor' using errcode = '22023';
  end if;
  if p_building_code is not null and (char_length(p_building_code) > 20 or p_building_code ~ '[[:cntrl:]]') then
    raise exception 'invalid_building_code' using errcode = '22023';
  end if;
  if p_notes is not null and (char_length(p_notes) > 200 or p_notes ~ '[[:cntrl:]]') then
    raise exception 'invalid_notes' using errcode = '22023';
  end if;
  if p_lat is null or p_lng is null
     or p_lat not between 29.4 and 33.4 or p_lng not between 34.2 and 35.95 then
    raise exception 'invalid_location' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public._validate_house(text, text, text, text, text, double precision, double precision)
  from public, anon, authenticated;

drop function if exists public.add_house(text, text, text, text, text, double precision, double precision);

create or replace function public.add_house(
  p_password      text,
  p_address       text,
  p_apartment     text,
  p_floor         text,
  p_building_code text,
  p_notes         text,
  p_lat           double precision,
  p_lng           double precision
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
  v_code      text := nullif(btrim(coalesce(p_building_code, '')), '');
  v_notes     text := nullif(btrim(coalesce(p_notes, '')), '');
  v_id        uuid;
begin
  if v_auth <> 'ok' then
    return jsonb_build_object('ok', false, 'error', v_auth);
  end if;

  perform public._validate_house(v_address, v_apartment, v_floor, v_code, v_notes, p_lat, p_lng);

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

  insert into public.houses (address, apartment, floor, building_code, notes, lat, lng, client_ip_hash)
  values (v_address, v_apartment, v_floor, v_code, v_notes, p_lat, p_lng, public._client_ip_hash())
  returning houses.id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.update_house(
  p_password      text,
  p_id            uuid,
  p_address       text,
  p_apartment     text,
  p_floor         text,
  p_building_code text,
  p_notes         text,
  p_lat           double precision,
  p_lng           double precision
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
  v_code      text := nullif(btrim(coalesce(p_building_code, '')), '');
  v_notes     text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if v_auth <> 'ok' then
    return jsonb_build_object('ok', false, 'error', v_auth);
  end if;

  perform public._validate_house(v_address, v_apartment, v_floor, v_code, v_notes, p_lat, p_lng);

  if exists (
    select 1 from public.houses h
    where h.id <> p_id
      and lower(h.address) = lower(v_address)
      and lower(coalesce(h.apartment, '')) = lower(coalesce(v_apartment, ''))
  ) then
    raise exception 'duplicate_house' using errcode = 'P0001';
  end if;

  update public.houses h
  set address = v_address, apartment = v_apartment, floor = v_floor, building_code = v_code,
      notes = v_notes, lat = p_lat, lng = p_lng
  where h.id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

revoke all on function public.add_house(text, text, text, text, text, text, double precision, double precision) from public;
revoke all on function public.update_house(text, uuid, text, text, text, text, text, double precision, double precision) from public;
grant execute on function public.add_house(text, text, text, text, text, text, double precision, double precision) to anon, authenticated;
grant execute on function public.update_house(text, uuid, text, text, text, text, text, double precision, double precision) to anon, authenticated;
