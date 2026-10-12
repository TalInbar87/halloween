-- Lets the gear button check the adults password before opening the admin panel.
-- Same rate limits as add/remove (wrong guesses are recorded by _check_adult_password).

create or replace function public.verify_adult_password(p_password text)
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
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.verify_adult_password(text) from public;
grant execute on function public.verify_adult_password(text) to anon, authenticated;
