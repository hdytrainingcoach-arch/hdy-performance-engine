-- LOT 1 · A — Fonctions d'autorisation (préalable aux migrations B→F)
--
-- Ajoute 3 helpers et fait évoluer can_access_player pour intégrer le
-- cloisonnement par équipe (audit S2/S3, cahier des charges §2/§9).
--
--   private.is_org_editor(org)   → staff avec droit d'écriture (exclut 'viewer')
--   private.is_org_medical(org)  → personnel médical (rôle staff_medical ou medical_clearance)
--   private.can_access_team(team)→ périmètre équipe d'un membre / d'un joueur
--
-- can_access_player devient : self OU (staff de l'org ET accès à l'équipe du joueur).
-- Un membre sans team_id (NULL) garde l'accès à toutes les équipes de son org.
-- Le super-admin conserve un accès total via private.is_super_admin().

-- ── is_org_editor ────────────────────────────────────────────────────────────
create or replace function private.is_org_editor(p_org_id uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select private.is_super_admin() or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.organization_id = p_org_id
      and m.active = true
      and m.role not in ('player', 'viewer')
  )
$$;
comment on function private.is_org_editor(uuid) is
  'Vrai si super-admin ou membre actif de l''organisation avec un rôle autorisé à écrire (tout rôle sauf player et viewer).';
revoke execute on function private.is_org_editor(uuid) from anon;
grant execute on function private.is_org_editor(uuid) to authenticated;

-- ── is_org_medical ───────────────────────────────────────────────────────────
create or replace function private.is_org_medical(p_org_id uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select private.is_super_admin() or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.organization_id = p_org_id
      and m.active = true
      and (m.role = 'staff_medical' or m.medical_clearance = true)
  )
$$;
comment on function private.is_org_medical(uuid) is
  'Vrai si super-admin ou membre actif avec le rôle staff_medical ou medical_clearance = true.';
revoke execute on function private.is_org_medical(uuid) from anon;
grant execute on function private.is_org_medical(uuid) to authenticated;

-- ── can_access_team ──────────────────────────────────────────────────────────
create or replace function private.can_access_team(p_team_id uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select private.is_super_admin()
  or exists (
    select 1 from public.players p
    where p.team_id = p_team_id and p.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.memberships m
    join public.teams t on t.id = p_team_id
    where m.user_id = auth.uid()
      and m.active = true
      and m.role <> 'player'
      and m.organization_id = t.organization_id
      and (m.team_id is null or m.team_id = p_team_id)
  )
$$;
comment on function private.can_access_team(uuid) is
  'Vrai si super-admin, joueur de cette équipe, ou membre staff de l''organisation dont le périmètre couvre cette équipe (team_id NULL = toutes les équipes).';
revoke execute on function private.can_access_team(uuid) from anon;
grant execute on function private.can_access_team(uuid) to authenticated;

-- ── can_access_player (évolution : ajout du périmètre équipe) ─────────────────
create or replace function private.can_access_player(p_id uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select private.is_super_admin() or exists (
    select 1
    from public.players p
    where p.id = p_id
      and (
        p.user_id = auth.uid()
        or (
          private.is_org_staff(p.organization_id)
          and (p.team_id is null or private.can_access_team(p.team_id))
        )
      )
  )
$$;

-- ROLLBACK
-- create or replace function private.can_access_player(p_id uuid)
-- returns boolean language sql stable security definer set search_path to 'public'
-- as $$
--   select private.is_super_admin() or exists (
--     select 1 from public.players p
--     where p.id = p_id and (p.user_id = auth.uid() or private.is_org_staff(p.organization_id))
--   )
-- $$;
-- drop function private.can_access_team(uuid);
-- drop function private.is_org_medical(uuid);
-- drop function private.is_org_editor(uuid);
