-- LOT 1 · C — Cloisonnement par équipe (audit S2, cahier des charges §2/§6)
--
-- can_access_player() (migration A) porte déjà le périmètre équipe pour toutes
-- les tables liées au joueur (gps_records, session_rpe, questionnaire_responses,
-- pain_declarations, test_results, consents, hrv_records, sous-dossiers joueur,
-- alerts…). Cette migration complète les 2 tables restantes qui filtraient au
-- niveau organisation seulement : players et sessions.

-- players : self OU (staff de l'org avec accès à l'équipe du joueur)
alter policy players_access_read on public.players
using ((user_id = auth.uid()) or private.can_access_player(id));

-- sessions : membre / éditeur de l'org, restreint à l'équipe de la séance
alter policy sessions_member_read on public.sessions
using (
  private.is_org_member(organization_id)
  and (team_id is null or private.can_access_team(team_id))
);

alter policy sessions_staff_write on public.sessions
using (
  private.is_org_editor(organization_id)
  and (team_id is null or private.can_access_team(team_id))
)
with check (
  private.is_org_editor(organization_id)
  and (team_id is null or private.can_access_team(team_id))
);

-- ROLLBACK
-- alter policy players_access_read on public.players
--   using ((user_id = auth.uid()) or private.is_org_staff(organization_id));
-- alter policy sessions_member_read on public.sessions
--   using (private.is_org_member(organization_id));
-- alter policy sessions_staff_write on public.sessions
--   using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));
