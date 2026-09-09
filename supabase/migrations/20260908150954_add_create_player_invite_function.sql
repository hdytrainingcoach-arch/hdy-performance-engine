create or replace function public.create_player_invite(
  p_player_id uuid,
  p_email text default null,
  p_expires_days int default 14
)
returns table(invite_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_player record;
  v_email text;
  v_token text;
  v_hash text;
  v_expires timestamptz;
  v_new_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select id, organization_id, email into v_player
  from public.players where id = p_player_id;

  if v_player.id is null then raise exception 'Player not found'; end if;

  if not (
    private.is_super_admin()
    or exists (
      select 1 from public.memberships m
      where m.user_id=v_uid and m.organization_id=v_player.organization_id and m.active=true
        and m.role in ('organization_admin','module_admin')
    )
  ) then raise exception 'Administrator access required'; end if;

  v_email := lower(coalesce(nullif(trim(p_email),''), v_player.email));
  if v_email is null or v_email = '' then
    raise exception 'No email available for this player — provide one explicitly.';
  end if;

  v_expires := now() + make_interval(days => greatest(1, least(coalesce(p_expires_days,14),30)));
  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32),'base64'), '+/', '-_'), '=');
  v_hash := encode(extensions.digest(v_token,'sha256'),'hex');

  insert into public.player_invites (player_id, email, token_hash, expires_at)
  values (p_player_id, v_email, v_hash, v_expires)
  returning id into v_new_id;

  return query select v_new_id, v_token, v_expires;
end;
$$;

grant execute on function public.create_player_invite(uuid, text, int) to authenticated;
revoke execute on function public.create_player_invite(uuid, text, int) from anon;
