-- LOT 1 — sécurité & isolation : script consolidé (migrations A→F)
-- Source : supabase/migrations/20260910090*.sql. À exécuter dans le SQL Editor Supabase.
-- Transaction unique : tout passe ou rien.

begin;

-- ─────────────────────────────────────────────────────────────────────
-- 20260910090000_lot1_a_helpers.sql
-- ─────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────
-- 20260910090100_lot1_b_medical_confidentiality.sql
-- ─────────────────────────────────────────────────────────────────────
-- LOT 1 · B — Confidentialité médicale (audit S1, cahier des charges §4, CA-06)
--
-- player_documents.access_scope : 'staff' (défaut) | 'player' | 'medical'
--   staff   → tout le staff de l'org (lecture) / éditeurs (écriture)
--   player  → staff + le joueur concerné (lecture) / éditeurs (écriture)
--   medical → personnel médical uniquement (lecture ET écriture)

alter policy player_documents_read on public.player_documents
using (
  case coalesce(access_scope, 'staff')
    when 'player'  then (private.is_org_staff(organization_id) or private.can_access_player(player_id))
    when 'medical' then private.is_org_medical(organization_id)
    else private.is_org_staff(organization_id)
  end
);

alter policy player_documents_staff_write on public.player_documents
using (
  case when coalesce(access_scope, 'staff') = 'medical'
    then private.is_org_medical(organization_id)
    else private.is_org_editor(organization_id)
  end
)
with check (
  case when coalesce(access_scope, 'staff') = 'medical'
    then private.is_org_medical(organization_id)
    else private.is_org_editor(organization_id)
  end
);


-- ─────────────────────────────────────────────────────────────────────
-- 20260910090200_lot1_c_team_scoping.sql
-- ─────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────
-- 20260910090300_lot1_d_viewer_read_only.sql
-- ─────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────
-- 20260910090400_lot1_e_audit_log_triggers.sql
-- ─────────────────────────────────────────────────────────────────────
-- LOT 1 · E — Journal d'audit (audit S9, cahier des charges §9)
--
-- audit_log existait mais n'était jamais écrit. On ajoute un trigger générique
-- AFTER INSERT/UPDATE/DELETE sur les tables sensibles : acteur (auth.uid()),
-- action (INSERT/UPDATE/DELETE), table, id cible, état avant / après.
--
-- Lecture de audit_log : déjà restreinte (policy audit_admin_read : super-admin
-- ou staff de l'org). Le trigger s'exécute en SECURITY DEFINER et contourne RLS
-- pour l'écriture, comme private.handle_new_user.

create or replace function private.write_audit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row   jsonb := to_jsonb(coalesce(new, old));
  v_org   uuid  := nullif(v_row ->> 'organization_id', '')::uuid;
  v_target uuid := nullif(v_row ->> 'id', '')::uuid;
begin
  insert into public.audit_log
    (organization_id, actor_user_id, action, target_table, target_id, before_data, after_data)
  values
    (v_org, auth.uid(), tg_op, tg_table_name, v_target,
     case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
     case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;
comment on function private.write_audit() is
  'Trigger générique : journalise toute écriture sur la table porteuse dans public.audit_log.';

do $$
declare
  t text;
  tables text[] := array[
    'players', 'memberships', 'player_documents', 'consents',
    'alerts', 'decisions', 'questionnaire_templates'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$I', t);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$I
         for each row execute function private.write_audit()', t);
  end loop;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- 20260910090500_lot1_f_revoke_anon_rpc.sql
-- ─────────────────────────────────────────────────────────────────────
-- LOT 1 · F — Durcissement des RPC d'invitation (audit S4, advisor 0028/0029)
--
-- create_* et claim_* ont des gardes internes (auth.uid() requis, rôle admin
-- pour la création) mais restent inutilement exécutables par le rôle 'anon'.
-- On retire 'anon' de ces 4 fonctions.
--
-- validate_player_invite / validate_staff_invite RESTENT ouvertes à 'anon' :
-- la page /join/* les appelle AVANT que l'utilisateur ait un compte, pour
-- afficher « Bienvenue … » et le mail autorisé.

revoke execute on function public.create_player_invite(uuid, text, integer) from anon;
revoke execute on function public.create_staff_invite(uuid, text, text, text, uuid, integer) from anon;
revoke execute on function public.claim_player_invite(text) from anon;
revoke execute on function public.claim_staff_invite(text) from anon;


-- Enregistre les migrations comme appliquées (évite la dérive avec supabase/migrations/)
insert into supabase_migrations.schema_migrations (version, name) values ('20260910090000', 'lot1_a_helpers') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20260910090100', 'lot1_b_medical_confidentiality') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20260910090200', 'lot1_c_team_scoping') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20260910090300', 'lot1_d_viewer_read_only') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20260910090400', 'lot1_e_audit_log_triggers') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20260910090500', 'lot1_f_revoke_anon_rpc') on conflict (version) do nothing;

commit;
