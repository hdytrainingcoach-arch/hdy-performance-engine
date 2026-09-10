-- LOT 1 · D — Rôle 'viewer' en lecture seule (audit S3)
--
-- Avant : is_org_staff() = « tout rôle sauf player ». Les policies d'écriture
-- (*_staff_write, FOR ALL) autorisaient donc un 'viewer' à modifier / supprimer.
-- Après : l'écriture passe par is_org_editor() = « tout rôle sauf player et viewer ».
-- La lecture du 'viewer' reste assurée par les policies *_read (is_org_member /
-- can_access_player), inchangées.
--
-- Note : player_documents et sessions ont déjà basculé sur is_org_editor dans les
-- migrations B et C.

alter policy alerts_staff_write            on public.alerts                   using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy consents_staff_write          on public.consents                 using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy decisions_staff_write         on public.decisions                using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy devactions_staff_write        on public.development_actions      using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy gps_staff_write               on public.gps_records             using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy player_club_history_staff_write on public.player_club_history    using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy devgoals_staff_write          on public.player_development_goals using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy player_education_staff_write  on public.player_education         using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy player_entry_baseline_staff_write on public.player_entry_baseline using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy player_guardians_staff_write  on public.player_guardians         using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy player_social_staff_write     on public.player_social_profiles   using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy player_training_age_staff_write on public.player_training_age    using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy players_staff_write           on public.players                  using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy qtemplates_staff_write        on public.questionnaire_templates  using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy testresults_staff_write       on public.test_results            using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));

-- test_definitions garde la garde "organization_id IS NOT NULL"
alter policy testdefs_staff_write on public.test_definitions
  using ((organization_id is not null) and private.is_org_editor(organization_id))
  with check ((organization_id is not null) and private.is_org_editor(organization_id));

-- hrv_records : écritures séparées, basées sur is_org_member (incluait 'player' et 'viewer')
alter policy hrv_records_insert_staff on public.hrv_records
  with check (
    private.is_org_editor(organization_id)
    and exists (select 1 from public.players p where p.id = hrv_records.player_id and p.organization_id = hrv_records.organization_id)
  );
alter policy hrv_records_update_staff on public.hrv_records
  using (private.is_org_editor(organization_id)) with check (private.is_org_editor(organization_id));
alter policy hrv_records_delete_staff on public.hrv_records
  using (private.is_org_editor(organization_id));

-- Reste connu (perf, non bloquant) : lint 0006 "multiple permissive policies" sur
-- le SELECT (policy *_read + clause USING de *_staff_write). Nettoyage prévu au LOT 10.

-- ROLLBACK : réappliquer chaque policy ci-dessus avec private.is_org_staff(...)
-- (et hrv_records_*_staff avec private.is_org_member(...)).
