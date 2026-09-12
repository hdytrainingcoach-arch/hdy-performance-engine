-- ============================================================================
-- HDY Performance Engine — régression du parcours joueur de bout en bout
-- ============================================================================
-- Ces trois vérifications couvrent trois bugs RÉELS et BLOQUANTS trouvés en
-- testant manuellement le parcours joueur le 2026-09-12 (aucun n'était détecté
-- par les suites précédentes, qui testaient chaque brique en isolation) :
--   1) validate_player_invite / claim_player_invite appelaient digest() sans
--      le schéma extensions -> AUCUNE activation de compte joueur possible.
--   2) questionnaire_templates / sessions n'étaient lisibles que par le staff
--      (is_org_member = memberships uniquement) -> le questionnaire Hooper/RPE
--      et les séances du jour étaient invisibles pour TOUT joueur.
--   3) session_rpe.load_ua est une colonne générée ; le payload applicatif
--      l'insérait explicitement -> AUCUNE saisie RPE ne pouvait être enregistrée.
--
-- Exécuter après toute migration touchant invites/RLS/session_rpe. Transaction
-- annulée à la fin : aucune donnée de test ne persiste.
-- ============================================================================

begin;

create temp table res(k text, v text) on commit drop;
grant all on res to authenticated;

insert into auth.users(id,email,aud,role)
values ('b0000000-0000-0000-0000-000000000001','pjtest-player@t.test','authenticated','authenticated');

with d as (select id as org from public.organizations where name ilike '%diambars%' limit 1)
insert into public.players(id, organization_id, team_id, first_name, last_name, display_name, status, active, user_id, email)
select 'b0000000-0000-0000-0000-000000000002', org, null, 'PJ', 'Test', 'PJ Test', 'disponible', true,
       'b0000000-0000-0000-0000-000000000001', 'pjtest-player@t.test'
from d;

insert into public.sessions(id, organization_id, team_id, title, type, session_date)
select 'b0000000-0000-0000-0000-000000000003', organization_id, null, 'Séance régression', 'entrainement', current_date
from public.players where id = 'b0000000-0000-0000-0000-000000000002';

-- ── 1. Le lien d'invitation se valide (digest trouvé, pas d'erreur silencieuse) ──
do $$
declare v_row record;
begin
  select * into v_row from public.validate_player_invite('token-inexistant-mais-digest-doit-fonctionner');
  -- aucune ligne pour un faux token : normal. Ce qui compte est l'ABSENCE d'exception.
  insert into res values ('1. validate_player_invite ne plante pas (digest resolu)', 'PASS');
exception when others then
  insert into res values ('1. validate_player_invite ne plante pas (digest resolu)', 'FAIL: '||sqlerrm);
end $$;

-- ── 2. Un joueur lit le questionnaire actif et sa séance du jour ────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}';
do $$
declare n_tpl int; n_sess int;
begin
  select count(*) into n_tpl from public.questionnaire_templates where type in ('OPR','RPE') and active=true;
  if n_tpl = 0 then raise exception 'FAIL : le joueur ne voit aucun questionnaire actif'; end if;
  select count(*) into n_sess from public.sessions where id = 'b0000000-0000-0000-0000-000000000003';
  if n_sess <> 1 then raise exception 'FAIL : le joueur ne voit pas la seance de son organisation'; end if;
  insert into res values ('2. joueur lit questionnaire + seance', 'PASS');
end $$;
reset role;

-- ── 3. Un joueur peut enregistrer un RPE SANS fournir load_ua (colonne générée) ──
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}';
do $$
declare v_load numeric;
begin
  insert into public.session_rpe(organization_id, session_id, player_id, rpe, actual_duration_min, submitted_at)
  select organization_id, 'b0000000-0000-0000-0000-000000000003', id, 6, 80, now()
  from public.players where id = 'b0000000-0000-0000-0000-000000000002';

  select load_ua into v_load from public.session_rpe
  where player_id = 'b0000000-0000-0000-0000-000000000002' and session_id = 'b0000000-0000-0000-0000-000000000003';

  if v_load is distinct from 480 then
    raise exception 'FAIL : load_ua attendu 480 (80*6), obtenu %', v_load;
  end if;
  insert into res values ('3. RPE sans load_ua explicite -> calcule a 480', 'PASS');
end $$;
reset role;

select k, v from res order by k;
rollback;
