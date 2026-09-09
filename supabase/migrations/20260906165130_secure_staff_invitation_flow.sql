create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('organization_admin','module_admin','team_admin','prepa_physique','coach','staff_medical','viewer')),
  permissions jsonb not null default '{}'::jsonb,
  medical_clearance boolean not null default false,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.staff_invites enable row level security;
revoke all on public.staff_invites from anon, authenticated;

create or replace function public.create_staff_invite(
  p_organization_id uuid,
  p_email text,
  p_full_name text,
  p_role text default 'prepa_physique',
  p_team_id uuid default null,
  p_expires_days integer default 14
)
returns table(invite_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
  v_hash text;
  v_id uuid;
  v_expires timestamptz;
  v_permissions jsonb;
  v_medical boolean := false;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not (
    private.is_super_admin()
    or exists (
      select 1 from public.memberships m
      where m.user_id=v_uid and m.organization_id=p_organization_id and m.active=true
        and m.role in ('organization_admin','module_admin')
    )
  ) then raise exception 'Administrator access required'; end if;
  if p_role not in ('organization_admin','module_admin','team_admin','prepa_physique','coach','staff_medical','viewer') then
    raise exception 'Role not allowed';
  end if;
  if p_expires_days < 1 or p_expires_days > 30 then raise exception 'Invalid expiration'; end if;
  if p_team_id is not null and not exists(select 1 from public.teams t where t.id=p_team_id and t.organization_id=p_organization_id) then
    raise exception 'Team does not belong to organization';
  end if;

  v_permissions := case p_role
    when 'prepa_physique' then '{"manage_players":true,"manage_monitoring":true,"manage_tests":true,"manage_teams":false,"manage_users":false,"manage_exports":true,"all_settings":false}'::jsonb
    when 'staff_medical' then '{"manage_players":true,"manage_monitoring":true,"manage_tests":false,"manage_teams":false,"manage_users":false,"manage_exports":false,"all_settings":false}'::jsonb
    when 'coach' then '{"manage_players":false,"manage_monitoring":true,"manage_tests":false,"manage_teams":false,"manage_users":false,"manage_exports":false,"all_settings":false}'::jsonb
    when 'viewer' then '{}'::jsonb
    else '{"manage_players":true,"manage_monitoring":true,"manage_tests":true,"manage_teams":true,"manage_users":true,"manage_exports":true,"all_settings":false}'::jsonb
  end;
  v_medical := (p_role='staff_medical');

  update public.staff_invites
    set revoked_at=now()
    where organization_id=p_organization_id
      and lower(email)=lower(trim(p_email))
      and used_at is null and revoked_at is null and expires_at>now();

  v_token := rtrim(translate(encode(extensions.gen_random_bytes(32),'base64'), '+/', '-_'), '=');
  v_hash := encode(extensions.digest(v_token,'sha256'),'hex');
  v_expires := now() + make_interval(days => p_expires_days);

  insert into public.staff_invites(organization_id,team_id,email,full_name,role,permissions,medical_clearance,token_hash,expires_at,invited_by)
  values(p_organization_id,p_team_id,lower(trim(p_email)),nullif(trim(p_full_name),''),p_role,v_permissions,v_medical,v_hash,v_expires,v_uid)
  returning id into v_id;

  return query select v_id,v_token,v_expires;
end;
$$;

create or replace function public.validate_staff_invite(p_token text)
returns table(invite_id uuid, organization_id uuid, organization_name text, team_id uuid, team_name text, email text, full_name text, role text, expires_at timestamptz, used boolean)
language sql
security definer
set search_path = public, extensions
as $$
  select i.id,i.organization_id,o.name,i.team_id,t.name,i.email,i.full_name,i.role,i.expires_at,(i.used_at is not null)
  from public.staff_invites i
  join public.organizations o on o.id=i.organization_id
  left join public.teams t on t.id=i.team_id
  where i.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
    and i.revoked_at is null
    and i.expires_at>now()
  limit 1
$$;

create or replace function public.claim_staff_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_hash text := encode(extensions.digest(p_token,'sha256'),'hex');
  v_invite public.staff_invites%rowtype;
  v_membership uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select * into v_invite
  from public.staff_invites
  where token_hash=v_hash and used_at is null and revoked_at is null and expires_at>now()
  for update;

  if v_invite.id is null then raise exception 'Invitation invalid or expired'; end if;
  if lower(v_invite.email)<>v_email then raise exception 'Email does not match invitation'; end if;

  insert into public.profiles(user_id,full_name,is_super_admin)
  values(v_uid,coalesce(v_invite.full_name,v_email),false)
  on conflict (user_id) do update set full_name=coalesce(excluded.full_name,public.profiles.full_name);

  select m.id into v_membership
  from public.memberships m
  where m.user_id=v_uid and m.organization_id=v_invite.organization_id
    and m.role=v_invite.role
    and ((m.team_id is null and v_invite.team_id is null) or m.team_id=v_invite.team_id)
  limit 1;

  if v_membership is null then
    insert into public.memberships(user_id,organization_id,team_id,role,permissions,medical_clearance,active)
    values(v_uid,v_invite.organization_id,v_invite.team_id,v_invite.role,v_invite.permissions,v_invite.medical_clearance,true)
    returning id into v_membership;
  else
    update public.memberships
      set permissions=v_invite.permissions,medical_clearance=v_invite.medical_clearance,active=true
      where id=v_membership;
  end if;

  update public.staff_invites set used_at=now() where id=v_invite.id;
  return v_membership;
end;
$$;

grant execute on function public.create_staff_invite(uuid,text,text,text,uuid,integer) to authenticated;
grant execute on function public.validate_staff_invite(text) to anon,authenticated;
grant execute on function public.claim_staff_invite(text) to authenticated;
