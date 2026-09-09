create table if not exists public.player_invites (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.player_invites enable row level security;

create or replace function public.validate_player_invite(p_token text)
returns table(player_id uuid, display_name text, email text, expires_at timestamptz, used boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  return query
  select p.id, p.display_name, i.email, i.expires_at, (i.used_at is not null)
  from public.player_invites i
  join public.players p on p.id = i.player_id
  where i.token_hash = v_hash
    and i.expires_at > now()
  limit 1;
end;
$$;

create or replace function public.claim_player_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_invite public.player_invites%rowtype;
  v_uid uuid;
  v_email text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Authentication required'; end if;
  v_email := lower(coalesce(auth.jwt()->>'email',''));
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_invite
  from public.player_invites
  where token_hash = v_hash
    and used_at is null
    and expires_at > now()
  for update;

  if v_invite.id is null then raise exception 'Invitation invalid or expired'; end if;
  if lower(v_invite.email) <> v_email then raise exception 'Email does not match invitation'; end if;

  update public.players
  set user_id = v_uid, email = v_invite.email
  where id = v_invite.player_id
    and (user_id is null or user_id = v_uid);

  if not found then raise exception 'Player already linked to another account'; end if;

  update public.player_invites set used_at = now() where id = v_invite.id;
  return v_invite.player_id;
end;
$$;

grant execute on function public.validate_player_invite(text) to anon, authenticated;
grant execute on function public.claim_player_invite(text) to authenticated;
revoke all on public.player_invites from anon, authenticated;
