-- BUG CRITIQUE (préexistant, découvert en testant le parcours joueur en conditions
-- réelles) : questionnaire_templates et sessions n'étaient lisibles que par
-- private.is_org_member(), qui ne regarde QUE la table memberships (staff).
-- Un joueur n'a jamais de ligne memberships (il est lié via players.user_id) :
-- il ne pouvait donc JAMAIS lire le questionnaire Hooper/RPE ni la liste des
-- séances du jour -> "Questionnaire Hooper indisponible" / "Aucune séance
-- aujourd'hui" pour absolument tous les joueurs, tout le temps.

create or replace function private.is_org_participant(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_org_member(p_org)
    or exists (select 1 from public.players p where p.user_id = auth.uid() and p.organization_id = p_org)
$$;
-- Contrairement à is_org_admin (jamais appelée que depuis une autre fonction
-- SECURITY DEFINER), celle-ci est référencée directement dans des policies RLS :
-- le rôle appelant (authenticated) doit donc pouvoir l'exécuter, comme is_org_member.
revoke all on function private.is_org_participant(uuid) from public;
grant execute on function private.is_org_participant(uuid) to authenticated, anon;

drop policy if exists qtemplates_member_read on public.questionnaire_templates;
create policy qtemplates_member_read on public.questionnaire_templates
  for select using (private.is_org_participant(organization_id));

drop policy if exists sessions_member_read on public.sessions;
create policy sessions_member_read on public.sessions
  for select using (
    (private.is_org_member(organization_id) and (team_id is null or private.can_access_team(team_id)))
    or exists (
      select 1 from public.players p
      where p.user_id = auth.uid()
        and p.organization_id = sessions.organization_id
        and (sessions.team_id is null or p.team_id = sessions.team_id)
    )
  );
