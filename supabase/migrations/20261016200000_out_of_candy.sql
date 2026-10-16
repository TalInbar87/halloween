-- "Candy's run out" for tonight: an adult marks a house; kids see a grey pumpkin
-- and navigation skips it. Can be switched back. Adults password required.

alter table public.houses
  add column out_of_candy boolean not null default false;

grant select (out_of_candy) on public.houses to anon, authenticated;

create or replace function public.set_out_of_candy(p_password text, p_id uuid, p_out boolean)
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

  update public.houses h set out_of_candy = coalesce(p_out, false) where h.id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.set_out_of_candy(text, uuid, boolean) from public;
grant execute on function public.set_out_of_candy(text, uuid, boolean) to anon, authenticated;
