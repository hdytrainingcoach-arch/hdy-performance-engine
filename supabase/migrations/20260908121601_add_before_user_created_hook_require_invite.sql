create or replace function public.hook_require_pending_invite(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text;
  v_has_invite boolean;
begin
  v_email := lower(coalesce(event->'user'->>'email', ''));
  if v_email = '' then
    return jsonb_build_object('error', jsonb_build_object('message','Email requis.','http_code',400));
  end if;

  select exists(
    select 1 from public.player_invites
    where lower(email) = v_email and used_at is null and expires_at > now()
    union all
    select 1 from public.staff_invites
    where lower(email) = v_email and used_at is null and revoked_at is null and expires_at > now()
  ) into v_has_invite;

  if v_has_invite then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object('error', jsonb_build_object(
    'message','Un compte ne peut être créé que via une invitation valide du staff.',
    'http_code',403
  ));
end;
$$;

grant execute on function public.hook_require_pending_invite(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_require_pending_invite(jsonb) from authenticated, anon, public;
