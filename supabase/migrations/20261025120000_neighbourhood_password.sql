-- Neighbourhood password: only people from the neighbourhood can see the map.
--
-- Until now anyone with the site URL could read `houses` straight from the API.
-- From here on the table is NOT readable through the API at all (grants revoked
-- below, on purpose); the list comes only from list_houses(), which checks the
-- neighbourhood password (or the adults password). Wrong guesses share the same
-- limits as the adults password (auth_failures: 10/hour per IP, 50/hour overall).
--
-- The password itself is NOT in this file (the repo is public). Set it once in the
-- Supabase SQL editor:
--
--   update public.app_secret
--   set view_password_hash = extensions.crypt('<the password>', extensions.gen_salt('bf', 10))
--   where id = 1;

alter table public.app_secret
  add column view_password_hash text;
-- app_secret: still no grants — reached only through security definer functions.

-- houses: no longer readable directly. Revoking at table level also revokes the
-- column grants given in earlier migrations.
revoke select on public.houses from anon, authenticated;
drop policy if exists "houses are publicly readable" on public.houses;

-- 'ok' | 'wrong_password' | 'not_configured'. The adults password also opens the map.
-- Records failures, so callers must RETURN (not RAISE) on failure.
create or replace function public._check_view_password(p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip    text := public._client_ip_hash();
  v_view  text;
  v_adult text;
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

  select s.view_password_hash, s.password_hash into v_view, v_adult from public.app_secret s where s.id = 1;
  if v_view is null and v_adult is null then
    return 'not_configured';
  end if;

  if p_password is not null and char_length(p_password) <= 100 and (
       (v_view is not null and v_view = extensions.crypt(p_password, v_view))
       or (v_adult is not null and v_adult = extensions.crypt(p_password, v_adult))
     ) then
    return 'ok';
  end if;

  insert into public.auth_failures (ip_hash) values (v_ip);
  return 'wrong_password';
end;
$$;
-- Internal helper: no grant to anon/authenticated, on purpose.
revoke all on function public._check_view_password(text) from public, anon, authenticated;

create or replace function public.list_houses(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth text := public._check_view_password(p_password);
begin
  if v_auth <> 'ok' then
    return jsonb_build_object('ok', false, 'error', v_auth);
  end if;

  return jsonb_build_object(
    'ok', true,
    'houses', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', h.id,
                 'address', h.address,
                 'street', h.street,
                 'house_number', h.house_number,
                 'apartment', h.apartment,
                 'floor', h.floor,
                 'building_code', h.building_code,
                 'out_of_candy', h.out_of_candy,
                 'lat', h.lat,
                 'lng', h.lng,
                 'notes', h.notes,
                 'created_at', h.created_at
               )
               order by h.created_at
             )
      from public.houses h
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_houses(text) from public;
grant execute on function public.list_houses(text) to anon, authenticated;
