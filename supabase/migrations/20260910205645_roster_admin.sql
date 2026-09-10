-- Gestion de l'effectif : déplacer un joueur d'équipe (surclassement), désactiver,
-- ou supprimer un doublon. Toutes ces actions passent par des fonctions serveur
-- réservées aux administrateurs de l'organisation, avec journal d'audit (trigger
-- write_audit déjà présent sur public.players).

create or replace function private.is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin()
     or exists (
       select 1 from public.memberships m
       where m.user_id = auth.uid()
         and m.organization_id = p_org
         and m.active = true
         and m.role in ('organization_admin','module_admin')
     );
$$;
revoke all on function private.is_org_admin(uuid) from public, anon, authenticated;

-- 1. Déplacer un joueur vers une autre équipe de la même organisation (ou "sans équipe").
create or replace function public.move_player_team(p_player_id uuid, p_new_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.players where id = p_player_id;
  if v_org is null then raise exception 'Joueur introuvable'; end if;
  if not private.is_org_admin(v_org) then raise exception 'Accès administrateur requis'; end if;
  if p_new_team_id is not null and not exists (
    select 1 from public.teams t where t.id = p_new_team_id and t.organization_id = v_org
  ) then
    raise exception 'L''équipe cible n''appartient pas à cette organisation';
  end if;
  update public.players
     set team_id = p_new_team_id, updated_at = now()
   where id = p_player_id;
end;
$$;
revoke all on function public.move_player_team(uuid, uuid) from public, anon;
grant execute on function public.move_player_team(uuid, uuid) to authenticated;

-- 2. Activer / désactiver un joueur (conserve tout l'historique).
create or replace function public.set_player_active(p_player_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.players where id = p_player_id;
  if v_org is null then raise exception 'Joueur introuvable'; end if;
  if not private.is_org_admin(v_org) then raise exception 'Accès administrateur requis'; end if;
  update public.players
     set active = coalesce(p_active, true), updated_at = now()
   where id = p_player_id;
end;
$$;
revoke all on function public.set_player_active(uuid, boolean) from public, anon;
grant execute on function public.set_player_active(uuid, boolean) to authenticated;

-- 3. Supprimer définitivement un joueur — uniquement s'il n'a AUCUNE donnée de suivi
--    ni compte rattaché (cas d'un doublon d'import). Sinon : désactiver.
create or replace function public.delete_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_uid uuid;
  v_blockers text[] := '{}';
  v_n bigint;
begin
  select organization_id, user_id into v_org, v_uid from public.players where id = p_player_id;
  if v_org is null then raise exception 'Joueur introuvable'; end if;
  if not private.is_org_admin(v_org) then raise exception 'Accès administrateur requis'; end if;

  if v_uid is not null then v_blockers := v_blockers || 'compte joueur rattaché'; end if;

  select count(*) into v_n from public.questionnaire_responses where player_id = p_player_id;
  if v_n > 0 then v_blockers := v_blockers || format('%s réponse(s) Hooper', v_n); end if;
  select count(*) into v_n from public.session_rpe where player_id = p_player_id;
  if v_n > 0 then v_blockers := v_blockers || format('%s RPE', v_n); end if;
  select count(*) into v_n from public.pain_declarations where player_id = p_player_id;
  if v_n > 0 then v_blockers := v_blockers || format('%s déclaration(s) de douleur', v_n); end if;
  select count(*) into v_n from public.gps_records where player_id = p_player_id;
  if v_n > 0 then v_blockers := v_blockers || format('%s ligne(s) GPS', v_n); end if;
  select count(*) into v_n from public.hrv_records where player_id = p_player_id;
  if v_n > 0 then v_blockers := v_blockers || format('%s mesure(s) HRV', v_n); end if;
  select count(*) into v_n from public.test_results where player_id = p_player_id;
  if v_n > 0 then v_blockers := v_blockers || format('%s résultat(s) de test', v_n); end if;
  select count(*) into v_n from public.medical_events where player_id = p_player_id;
  if v_n > 0 then v_blockers := v_blockers || format('%s événement(s) médical(aux)', v_n); end if;
  select count(*) into v_n from public.medical_histories where player_id = p_player_id;
  if v_n > 0 then v_blockers := v_blockers || 'antécédents médicaux'; end if;

  if array_length(v_blockers, 1) > 0 then
    raise exception 'Suppression refusée — ce joueur a : %. Utilise « Désactiver » pour conserver l''historique.',
      array_to_string(v_blockers, ', ');
  end if;

  delete from public.players where id = p_player_id;
end;
$$;
revoke all on function public.delete_player(uuid) from public, anon;
grant execute on function public.delete_player(uuid) to authenticated;

-- Verrou : plus aucune suppression directe de joueur depuis le client ;
-- seule la fonction delete_player (SECURITY DEFINER) peut supprimer.
drop policy if exists players_block_direct_delete on public.players;
create policy players_block_direct_delete on public.players
  as restrictive for delete to authenticated using (false);
