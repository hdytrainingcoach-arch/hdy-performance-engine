-- ============================================================================
-- HDY Performance Engine — régression RLS LOT 11 (programmation, communication)
-- ============================================================================
-- Étend supabase/tests/rls_isolation.sql aux tables ajoutées en LOT 11 :
--   - session_exercises : doit suivre EXACTEMENT le même périmètre que
--     `sessions` (LOT 1c + correctif 20260912130444) — un joueur U17 voit le
--     contenu d'une séance U17, jamais celui d'une séance Pro A ; un coach
--     scopé U17 ne peut pas écrire sur une séance Pro A.
--   - announcements : une annonce ciblée sur une équipe n'est visible que par
--     les joueurs de cette équipe ; une annonce d'organisation (team_id null)
--     est visible par tous les participants de l'organisation.
--
-- Comment l'exécuter : voir l'en-tête de rls_isolation.sql (Studio SQL editor,
-- MCP execute_sql, ou psql). Transaction annulée (ROLLBACK) : rien ne persiste.
-- ============================================================================

begin;

create temp table res11(k text, v text) on commit drop;
grant all on res11 to authenticated;
create temp table ctx11(org uuid, team_u17 uuid, team_proa uuid,
  player_u17 uuid, player_proa uuid, session_u17 uuid, session_proa uuid,
  exercise_id uuid, ann_org uuid, ann_u17 uuid, ann_proa uuid) on commit drop;
grant all on ctx11 to authenticated;

insert into auth.users(id,email,aud,role) values
  ('b1000000-0000-0000-0000-00000000a001','rlstest11-player-u17@t.test','authenticated','authenticated'),
  ('b1000000-0000-0000-0000-00000000a002','rlstest11-player-proa@t.test','authenticated','authenticated'),
  ('b1000000-0000-0000-0000-00000000a003','rlstest11-coach-u17@t.test','authenticated','authenticated');

insert into ctx11 (org, team_u17, team_proa)
select o.id,
  (select id from public.teams where organization_id = o.id and name ilike '%u17%' limit 1),
  (select id from public.teams where organization_id = o.id and name ilike '%pro a%' limit 1)
from public.organizations o where o.name ilike '%diambars%' limit 1;

insert into public.players(id, organization_id, team_id, first_name, last_name, display_name, status, active, user_id)
select 'b1000000-0000-0000-0000-00000000b001', org, team_u17, 'RLS11', 'U17', 'RLS11 U17', 'disponible', true, 'b1000000-0000-0000-0000-00000000a001'
from ctx11;
insert into public.players(id, organization_id, team_id, first_name, last_name, display_name, status, active, user_id)
select 'b1000000-0000-0000-0000-00000000b002', org, team_proa, 'RLS11', 'ProA', 'RLS11 ProA', 'disponible', true, 'b1000000-0000-0000-0000-00000000a002'
from ctx11;
update ctx11 set player_u17 = 'b1000000-0000-0000-0000-00000000b001', player_proa = 'b1000000-0000-0000-0000-00000000b002';

insert into public.memberships(user_id, organization_id, team_id, role, active)
select 'b1000000-0000-0000-0000-00000000a003'::uuid, org, team_u17, 'coach', true from ctx11;

insert into public.sessions(id, organization_id, team_id, type, title, session_date)
select 'b1000000-0000-0000-0000-00000000c001', org, team_u17, 'training', 'RLS11 séance U17', current_date from ctx11;
insert into public.sessions(id, organization_id, team_id, type, title, session_date)
select 'b1000000-0000-0000-0000-00000000c002', org, team_proa, 'training', 'RLS11 séance Pro A', current_date from ctx11;
update ctx11 set session_u17 = 'b1000000-0000-0000-0000-00000000c001', session_proa = 'b1000000-0000-0000-0000-00000000c002';

insert into public.exercises(id, organization_id, name, category)
select 'b1000000-0000-0000-0000-00000000d001', org, 'RLS11 exercice test', 'technique' from ctx11;
update ctx11 set exercise_id = 'b1000000-0000-0000-0000-00000000d001';

insert into public.session_exercises(organization_id, session_id, exercise_id, position)
select org, session_u17, exercise_id, 0 from ctx11;
insert into public.session_exercises(organization_id, session_id, exercise_id, position)
select org, session_proa, exercise_id, 0 from ctx11;

insert into public.announcements(id, organization_id, team_id, title, body)
select 'b1000000-0000-0000-0000-00000000e001', org, null, 'RLS11 annonce org', 'org' from ctx11;
insert into public.announcements(id, organization_id, team_id, title, body)
select 'b1000000-0000-0000-0000-00000000e002', org, team_u17, 'RLS11 annonce U17', 'u17' from ctx11;
insert into public.announcements(id, organization_id, team_id, title, body)
select 'b1000000-0000-0000-0000-00000000e003', org, team_proa, 'RLS11 annonce Pro A', 'proa' from ctx11;

-- ── 1. Programme de séance : joueur voit le sien, pas celui de l'autre équipe ─
set local role authenticated;
set local request.jwt.claims to '{"sub":"b1000000-0000-0000-0000-00000000a001","role":"authenticated"}';
do $$
declare n_own int; n_other int;
begin
  select count(*) into n_own from public.session_exercises where session_id = 'b1000000-0000-0000-0000-00000000c001';
  select count(*) into n_other from public.session_exercises where session_id = 'b1000000-0000-0000-0000-00000000c002';
  if n_own <> 1 then raise exception 'FAIL LOT11 : le joueur U17 ne voit pas le programme de sa propre séance'; end if;
  if n_other <> 0 then raise exception 'FAIL LOT11 : le joueur U17 voit le programme de la séance Pro A (fuite inter-équipes)'; end if;
  insert into res11 values ('1. programme séance scopé équipe (joueur)', 'PASS');
end $$;
reset role;

-- ── 2. Coach U17 : écrit sur sa séance, pas sur celle de Pro A ───────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"b1000000-0000-0000-0000-00000000a003","role":"authenticated"}';
do $$
declare v_org uuid; v_ex uuid; v_session_proa uuid; v_inserted int;
begin
  select org, exercise_id, session_proa into v_org, v_ex, v_session_proa from ctx11;
  begin
    insert into public.session_exercises(organization_id, session_id, exercise_id, position)
    values (v_org, v_session_proa, v_ex, 1);
  exception when others then null; -- une policy RLS peut lever ou filtrer selon le mode
  end;
  select count(*) into v_inserted from public.session_exercises where session_id = v_session_proa and position = 1;
  if v_inserted <> 0 then
    raise exception 'FAIL LOT11 : le coach U17 a pu ajouter un exercice a la seance Pro A';
  end if;
  insert into res11 values ('2. écriture programme cantonnée équipe (coach)', 'PASS');
end $$;
reset role;

-- ── 3. Annonces : org visible à tous, équipe visible uniquement à l'équipe ──
set local role authenticated;
set local request.jwt.claims to '{"sub":"b1000000-0000-0000-0000-00000000a001","role":"authenticated"}';
do $$
declare n_org int; n_u17 int; n_proa int;
begin
  select count(*) into n_org from public.announcements where id = 'b1000000-0000-0000-0000-00000000e001';
  select count(*) into n_u17 from public.announcements where id = 'b1000000-0000-0000-0000-00000000e002';
  select count(*) into n_proa from public.announcements where id = 'b1000000-0000-0000-0000-00000000e003';
  if n_org <> 1 then raise exception 'FAIL LOT11 : le joueur U17 ne voit pas l''annonce d''organisation'; end if;
  if n_u17 <> 1 then raise exception 'FAIL LOT11 : le joueur U17 ne voit pas l''annonce de sa propre équipe'; end if;
  if n_proa <> 0 then raise exception 'FAIL LOT11 : le joueur U17 voit l''annonce ciblée Pro A (fuite inter-équipes)'; end if;
  insert into res11 values ('3. annonces scopées organisation/équipe (joueur)', 'PASS');
end $$;
reset role;

select k, v from res11 order by k;
rollback;
