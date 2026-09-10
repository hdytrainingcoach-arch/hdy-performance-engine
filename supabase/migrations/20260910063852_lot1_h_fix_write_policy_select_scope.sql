-- LOT 1 · H — Correctif C/D : les policies *_staff_write (FOR ALL) élargissaient
-- le SELECT à toute l'organisation et court-circuitaient le cloisonnement équipe.
--
-- Correctif : la clause USING de chaque *_staff_write reprend EXACTEMENT la
-- condition de la policy *_read correspondante (aucun élargissement de lecture),
-- et WITH CHECK garde le contrôle éditeur + périmètre pour les écritures.
--
-- Vérifié : coach U17 → voit U17 uniquement ; viewer → lecture seule ;
-- médical → seul à voir les documents 'medical'.

-- ── tables scopées joueur (read = can_access_player(player_id)) ───────────────
alter policy consents_staff_write            on public.consents
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy gps_staff_write                 on public.gps_records
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy player_club_history_staff_write on public.player_club_history
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy devgoals_staff_write            on public.player_development_goals
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy player_education_staff_write    on public.player_education
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy player_entry_baseline_staff_write on public.player_entry_baseline
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy player_guardians_staff_write    on public.player_guardians
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy player_social_staff_write       on public.player_social_profiles
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy player_training_age_staff_write on public.player_training_age
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy testresults_staff_write         on public.test_results
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));

-- hrv_records : écritures déjà séparées (INSERT/UPDATE/DELETE)
alter policy hrv_records_update_staff on public.hrv_records
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));
alter policy hrv_records_delete_staff on public.hrv_records
  using (private.can_access_player(player_id));

-- ── players : read = self OR can_access_player(id) ───────────────────────────
alter policy players_staff_write on public.players
  using ((user_id = auth.uid()) or private.can_access_player(id))
  with check (private.is_org_editor(organization_id));

-- ── player_documents : read = CASE selon access_scope ────────────────────────
alter policy player_documents_staff_write on public.player_documents
  using (
    case coalesce(access_scope, 'staff')
      when 'player'  then (private.is_org_staff(organization_id) or private.can_access_player(player_id))
      when 'medical' then private.is_org_medical(organization_id)
      else private.is_org_staff(organization_id)
    end
  )
  with check (
    case when coalesce(access_scope, 'staff') = 'medical'
      then private.is_org_medical(organization_id)
      else (private.is_org_editor(organization_id) and private.can_access_player(player_id))
    end
  );

-- ── tables au niveau organisation (read = is_org_member) ─────────────────────
alter policy decisions_staff_write   on public.decisions
  using (private.is_org_member(organization_id))
  with check (private.is_org_editor(organization_id));
alter policy devactions_staff_write  on public.development_actions
  using (private.is_org_member(organization_id))
  with check (private.is_org_editor(organization_id));
alter policy qtemplates_staff_write  on public.questionnaire_templates
  using (private.is_org_member(organization_id))
  with check (private.is_org_editor(organization_id));

-- ── alerts : read = is_org_staff(org) OR can_access_player ───────────────────
alter policy alerts_staff_write on public.alerts
  using (private.is_org_staff(organization_id) or ((player_id is not null) and private.can_access_player(player_id)))
  with check (private.is_org_editor(organization_id));

-- ── test_definitions : read = org NULL OR is_org_member ──────────────────────
alter policy testdefs_staff_write on public.test_definitions
  using ((organization_id is null) or private.is_org_member(organization_id))
  with check ((organization_id is not null) and private.is_org_editor(organization_id));

-- Reste connu : lint 0006 "multiple permissive policies" — conditions désormais
-- identiques entre *_read et *_staff_write (coût négligeable). Fusion au LOT 10.
