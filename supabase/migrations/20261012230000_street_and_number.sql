-- Split the free-text address into street + house number. The city is always
-- Kiryat Ono, so it is not stored; `address` becomes the display form "street number".

alter table public.houses
  add column street       text check (street is null or char_length(street) between 2 and 100),
  add column house_number text check (house_number is null or house_number ~ '^[0-9]{1,4}[א-ת]?$');

grant select (street, house_number) on public.houses to anon, authenticated;

-- Backfill existing rows: "נהר הירדן 27 קרית אונו" → street "נהר הירדן", number "27".
with cleaned as (
  select id,
         btrim(regexp_replace(
           regexp_replace(
             regexp_replace(split_part(address, ',', 1),
                            '(קר(י)?ית[[:space:]-]*אונו|kiryat[[:space:]-]*ono)', ' ', 'gi'),
             '^[[:space:]]*(רחוב|רח''?)[[:space:]]+', ''),
           '[[:space:]]+', ' ', 'g')) as v
  from public.houses
)
update public.houses h
set house_number = nullif(regexp_replace(substring(c.v from '([0-9]{1,4}[[:space:]]*[א-ת]?)$'), '[[:space:]]', '', 'g'), ''),
    street       = btrim(regexp_replace(c.v, '[[:space:]]*[0-9]+[[:space:]]*[א-ת]?$', ''))
from cleaned c
where c.id = h.id;

update public.houses
set address = street || ' ' || house_number
where street is not null and house_number is not null;

drop function if exists public.add_house(text, text, text, text, text, text, double precision, double precision);
drop function if exists public.update_house(text, uuid, text, text, text, text, text, double precision, double precision);

create or replace function public._validate_street(p_street text, p_house_number text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_street is null or char_length(p_street) < 2 or char_length(p_street) > 100 or p_street ~ '[[:cntrl:]]' then
    raise exception 'invalid_street' using errcode = '22023';
  end if;
  if p_house_number is null or p_house_number !~ '^[0-9]{1,4}[א-ת]?$' then
    raise exception 'invalid_house_number' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public._validate_street(text, text) from public, anon, authenticated;

create or replace function public.add_house(
  p_password      text,
  p_street        text,
  p_house_number  text,
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
  v_street    text := btrim(regexp_replace(coalesce(p_street, ''), '[[:space:]]+', ' ', 'g'));
  v_number    text := regexp_replace(coalesce(p_house_number, ''), '[[:space:]]', '', 'g');
  v_apartment text := nullif(btrim(coalesce(p_apartment, '')), '');
  v_floor     text := nullif(btrim(coalesce(p_floor, '')), '');
  v_code      text := nullif(btrim(coalesce(p_building_code, '')), '');
  v_notes     text := nullif(btrim(coalesce(p_notes, '')), '');
  v_id        uuid;
begin
  if v_auth <> 'ok' then
    return jsonb_build_object('ok', false, 'error', v_auth);
  end if;

  perform public._validate_street(v_street, v_number);
  perform public._validate_house(v_street || ' ' || v_number, v_apartment, v_floor, v_code, v_notes, p_lat, p_lng);

  if (select count(*) from public.houses) >= 500 then
    raise exception 'map_full' using errcode = 'P0001';
  end if;
  if (select count(*) from public.houses h where h.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.houses h
    where lower(h.street) = lower(v_street) and h.house_number = v_number
      and lower(coalesce(h.apartment, '')) = lower(coalesce(v_apartment, ''))
  ) then
    raise exception 'duplicate_house' using errcode = 'P0001';
  end if;

  insert into public.houses
    (address, street, house_number, apartment, floor, building_code, notes, lat, lng, client_ip_hash)
  values
    (v_street || ' ' || v_number, v_street, v_number, v_apartment, v_floor, v_code, v_notes, p_lat, p_lng,
     public._client_ip_hash())
  returning houses.id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.update_house(
  p_password      text,
  p_id            uuid,
  p_street        text,
  p_house_number  text,
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
  v_street    text := btrim(regexp_replace(coalesce(p_street, ''), '[[:space:]]+', ' ', 'g'));
  v_number    text := regexp_replace(coalesce(p_house_number, ''), '[[:space:]]', '', 'g');
  v_apartment text := nullif(btrim(coalesce(p_apartment, '')), '');
  v_floor     text := nullif(btrim(coalesce(p_floor, '')), '');
  v_code      text := nullif(btrim(coalesce(p_building_code, '')), '');
  v_notes     text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if v_auth <> 'ok' then
    return jsonb_build_object('ok', false, 'error', v_auth);
  end if;

  perform public._validate_street(v_street, v_number);
  perform public._validate_house(v_street || ' ' || v_number, v_apartment, v_floor, v_code, v_notes, p_lat, p_lng);

  if exists (
    select 1 from public.houses h
    where h.id <> p_id
      and lower(h.street) = lower(v_street) and h.house_number = v_number
      and lower(coalesce(h.apartment, '')) = lower(coalesce(v_apartment, ''))
  ) then
    raise exception 'duplicate_house' using errcode = 'P0001';
  end if;

  update public.houses h
  set address = v_street || ' ' || v_number, street = v_street, house_number = v_number,
      apartment = v_apartment, floor = v_floor, building_code = v_code, notes = v_notes,
      lat = p_lat, lng = p_lng
  where h.id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

revoke all on function public.add_house(text, text, text, text, text, text, text, double precision, double precision) from public;
revoke all on function public.update_house(text, uuid, text, text, text, text, text, text, double precision, double precision) from public;
grant execute on function public.add_house(text, text, text, text, text, text, text, double precision, double precision) to anon, authenticated;
grant execute on function public.update_house(text, uuid, text, text, text, text, text, text, double precision, double precision) to anon, authenticated;
