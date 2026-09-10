-- LOT 2a — Hiérarchie d'organisations
--
-- « HDY Performance Engine » devient l'organisation racine ; Diambars FC et
-- HDY Elite deviennent ses enfants (environnements). Aucune donnée déplacée :
-- joueurs, équipes, memberships, GPS… restent rattachés à Diambars / Elite.
--
-- Modèle d'accès :
--   • membership sur la racine  → racine + tous les enfants (admin HDY global)
--   • membership sur un enfant   → cet enfant uniquement (+ ses équipes), pas le frère
--   • périmètre par équipe (LOT 1) : inchangé pour les membres directs d'un enfant
--   • super-admin : accès total (inchangé)
--
-- Correctif de récursion : voir 20260910101234_lot2a_fix_org_policy_recursion.sql

alter table public.organizations
  add column if not exists parent_organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_organizations_parent on public.organizations (parent_organization_id);

do $$
declare v_root uuid;
begin
  select id into v_root
  from public.organizations
  where name = 'HDY Performance Engine' and parent_organization_id is null;

  if v_root is null then
    insert into public.organizations (name, type, timezone, branding, settings, active)
    values (
      'HDY Performance Engine', 'platform', 'Europe/Paris',
      jsonb_build_object(
        'label', 'HDY PERFORMANCE ENGINE', 'theme', 'hdy', 'logo_key', 'hdy',
        'primary', '#111111', 'secondary', '#FFFFFF', 'background', '#F5F5F5',
        'is_root', true
      ),
      '{}'::jsonb, true
    )
    returning id into v_root;
  end if;

  update public.organizations
  set parent_organization_id = v_root
  where id in (
    'd3136b7f-ef28-43e8-af53-30fa6de70c62',  -- Diambars FC
    '5454ad8f-8f2b-4812-9923-ab7d0b1f8748'   -- HDY Elite
  )
  and parent_organization_id is null;
end $$;

-- Portée des memberships : org de rattachement + tous ses descendants
create or replace function private.membership_scope()
returns table(org_id uuid, role text, medical_clearance boolean)
language sql stable security definer set search_path to 'public'
as $$
  with recursive base as (
    select m.organization_id as org_id, m.role, m.medical_clearance
    from public.memberships m
    where m.user_id = auth.uid() and m.active = true
  ),
  expanded as (
    select org_id, role, medical_clearance from base
    union
    select o.id, e.role, e.medical_clearance
    from public.organizations o
    join expanded e on o.parent_organization_id = e.org_id
  )
  select org_id, role, medical_clearance from expanded
$$;
revoke execute on function private.membership_scope() from anon;
grant execute on function private.membership_scope() to authenticated;

create or replace function private.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select private.is_super_admin()
    or exists (select 1 from private.membership_scope() s where s.org_id = is_org_member.org_id)
$$;

create or replace function private.is_org_staff(org_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select private.is_super_admin()
    or exists (select 1 from private.membership_scope() s
               where s.org_id = is_org_staff.org_id and s.role <> 'player')
$$;

create or replace function private.is_org_editor(p_org_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select private.is_super_admin()
    or exists (select 1 from private.membership_scope() s
               where s.org_id = p_org_id and s.role not in ('player', 'viewer'))
$$;

create or replace function private.is_org_medical(p_org_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select private.is_super_admin()
    or exists (select 1 from private.membership_scope() s
               where s.org_id = p_org_id and (s.role = 'staff_medical' or s.medical_clearance))
$$;

-- Périmètre équipe : restriction appliquée uniquement aux membres DIRECTS de
-- l'org de l'équipe (un staff d'une org ancêtre voit toutes les équipes).
create or replace function private.can_access_team(p_team_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select private.is_super_admin()
  or exists (select 1 from public.players p where p.team_id = p_team_id and p.user_id = auth.uid())
  or (
    exists (select 1 from public.teams t where t.id = p_team_id and private.is_org_staff(t.organization_id))
    and (
      not exists (
        select 1
        from public.teams t
        join public.memberships m on m.organization_id = t.organization_id
        where t.id = p_team_id and m.user_id = auth.uid() and m.active
          and m.role <> 'player' and m.team_id is not null
      )
      or exists (
        select 1
        from public.memberships m
        join public.teams t on t.organization_id = m.organization_id
        where t.id = p_team_id and m.user_id = auth.uid() and m.active
          and m.role <> 'player' and (m.team_id is null or m.team_id = p_team_id)
      )
    )
  )
$$;

-- ROLLBACK
-- Restaurer les corps de is_org_member / is_org_staff / can_access_team des
-- migrations 20260910062935 (a_helpers) et antérieures, puis :
-- update public.organizations set parent_organization_id = null
--   where id in ('d3136b7f-ef28-43e8-af53-30fa6de70c62','5454ad8f-8f2b-4812-9923-ab7d0b1f8748');
-- delete from public.organizations where name = 'HDY Performance Engine' and parent_organization_id is null;
-- alter table public.organizations drop column parent_organization_id;
-- drop function private.membership_scope();
