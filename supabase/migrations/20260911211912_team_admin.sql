-- Gestion des équipes par les administrateurs d'organisation : créer, renommer,
-- archiver/réactiver, supprimer (si vide). La table `teams` n'a aujourd'hui aucune
-- policy d'écriture (lecture seule pour les membres) : tout passe par ces fonctions
-- SECURITY DEFINER, sur le même modèle que la gestion de l'effectif (roster_admin).

create or replace function public.create_team(p_organization_id uuid, p_name text, p_category text default null, p_season text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not private.is_org_admin(p_organization_id) then raise exception 'Acces administrateur requis'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Le nom de l''equipe est obligatoire'; end if;
  insert into public.teams(organization_id,name,category,season,active)
  values (p_organization_id, trim(p_name), nullif(trim(p_category),''), nullif(trim(p_season),''), true)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_team(uuid, text, text, text) from public, anon;
grant execute on function public.create_team(uuid, text, text, text) to authenticated;

create or replace function public.update_team(p_team_id uuid, p_name text, p_category text default null, p_season text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.teams where id = p_team_id;
  if v_org is null then raise exception 'Equipe introuvable'; end if;
  if not private.is_org_admin(v_org) then raise exception 'Acces administrateur requis'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Le nom de l''equipe est obligatoire'; end if;
  update public.teams
     set name = trim(p_name), category = nullif(trim(p_category),''), season = nullif(trim(p_season),'')
   where id = p_team_id;
end;
$$;
revoke all on function public.update_team(uuid, text, text, text) from public, anon;
grant execute on function public.update_team(uuid, text, text, text) to authenticated;

create or replace function public.set_team_active(p_team_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.teams where id = p_team_id;
  if v_org is null then raise exception 'Equipe introuvable'; end if;
  if not private.is_org_admin(v_org) then raise exception 'Acces administrateur requis'; end if;
  update public.teams set active = coalesce(p_active, true) where id = p_team_id;
end;
$$;
revoke all on function public.set_team_active(uuid, boolean) from public, anon;
grant execute on function public.set_team_active(uuid, boolean) to authenticated;

create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid; v_players bigint; v_staff bigint;
begin
  select organization_id into v_org from public.teams where id = p_team_id;
  if v_org is null then raise exception 'Equipe introuvable'; end if;
  if not private.is_org_admin(v_org) then raise exception 'Acces administrateur requis'; end if;

  select count(*) into v_players from public.players where team_id = p_team_id;
  select count(*) into v_staff from public.memberships where team_id = p_team_id;
  if v_players > 0 or v_staff > 0 then
    raise exception 'Suppression refusee -- % joueur(s) et % membre(s) du staff sont encore lies a cette equipe. Deplace-les ou utilise "Archiver".', v_players, v_staff;
  end if;

  delete from public.teams where id = p_team_id;
end;
$$;
revoke all on function public.delete_team(uuid) from public, anon;
grant execute on function public.delete_team(uuid) to authenticated;
