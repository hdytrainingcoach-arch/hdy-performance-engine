-- ============================================================================
-- HDY Performance Engine — suite de régression RLS / permissions (CA-14, CA-04, CA-06)
-- ============================================================================
-- Objectif : vérifier automatiquement, après chaque migration touchant aux
-- politiques RLS ou aux fonctions d'administration, que :
--   1) un joueur ne lit/modifie jamais les données d'un autre joueur (CA-04)
--   2) un coach est cantonné à son équipe (LOT 1)
--   3) le dossier médical reste invisible au coach (CA-06)
--   4) les actions d'administration (déplacer/désactiver/supprimer un joueur,
--      créer/supprimer une équipe) sont réservées aux admins d'organisation,
--      et la suppression directe d'un joueur est bloquée côté client
--
-- Comment l'exécuter :
--   - Supabase Studio → SQL Editor → coller ce fichier → Run
--   - ou : mcp__<supabase>__execute_sql avec ce contenu
--   - ou : psql "$DATABASE_URL" -f supabase/tests/rls_isolation.sql
--
-- Le script tourne entièrement dans une transaction annulée à la fin
-- (ROLLBACK) : aucune donnée de test ne persiste, jamais.
-- À la fin, la requête SELECT affiche une ligne par vérification ; si une
-- vérification échoue, le script s'arrête immédiatement avec une erreur
-- explicite (échec bruyant, pas de faux positif silencieux).
-- ============================================================================

begin;

create temp table res(k text, v text) on commit drop;
grant all on res to authenticated;
create temp table ctx(org_diambars uuid, org_elite uuid, team_u17 uuid, team_proa uuid,
  player_u17 uuid, player_proa uuid) on commit drop;
grant all on ctx to authenticated;

-- ── Jeu de données temporaire ────────────────────────────────────────────────
insert into auth.users(id,email,aud,role) values
  ('a0000000-0000-0000-0000-00000000a001','rlstest-player-u17@t.test','authenticated','authenticated'),
  ('a0000000-0000-0000-0000-00000000a002','rlstest-player-proa@t.test','authenticated','authenticated'),
  ('a0000000-0000-0000-0000-00000000a003','rlstest-coach-u17@t.test','authenticated','authenticated'),
  ('a0000000-0000-0000-0000-00000000a004','rlstest-medical@t.test','authenticated','authenticated'),
  ('a0000000-0000-0000-0000-00000000a005','rlstest-org-admin@t.test','authenticated','authenticated');

insert into ctx (org_diambars, team_u17, team_proa)
select o.id,
  (select id from public.teams where organization_id = o.id and name ilike '%u17%' limit 1),
  (select id from public.teams where organization_id = o.id and name ilike '%pro a%' limit 1)
from public.organizations o where o.name ilike '%diambars%' limit 1;

insert into public.players(id, organization_id, team_id, first_name, last_name, display_name, status, active, user_id)
select 'a0000000-0000-0000-0000-00000000b001', org_diambars, team_u17, 'RLS', 'U17', 'RLS U17', 'disponible', true, 'a0000000-0000-0000-0000-00000000a001'
from ctx;
insert into public.players(id, organization_id, team_id, first_name, last_name, display_name, status, active, user_id)
select 'a0000000-0000-0000-0000-00000000b002', org_diambars, team_proa, 'RLS', 'ProA', 'RLS ProA', 'disponible', true, 'a0000000-0000-0000-0000-00000000a002'
from ctx;
update ctx set player_u17 = 'a0000000-0000-0000-0000-00000000b001', player_proa = 'a0000000-0000-0000-0000-00000000b002';

insert into public.medical_histories(organization_id, player_id, pathologies)
select org_diambars, player_u17, 'Antécédent confidentiel — ne doit jamais être lu par un coach' from ctx;

insert into public.memberships(user_id, organization_id, team_id, role, active, medical_clearance)
select 'a0000000-0000-0000-0000-00000000a003'::uuid, org_diambars, team_u17, 'coach', true, false from ctx
union all
select 'a0000000-0000-0000-0000-00000000a004'::uuid, org_diambars, null::uuid, 'staff_medical', true, true from ctx
union all
select 'a0000000-0000-0000-0000-00000000a005'::uuid, org_diambars, null::uuid, 'organization_admin', true, false from ctx;

-- ── 1. Isolation joueur A / joueur B (CA-04) ────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000a001","role":"authenticated"}';
do $$
declare v_other record; v_self record;
begin
  select * into v_other from public.players where id = 'a0000000-0000-0000-0000-00000000b002';
  if v_other is not null then
    raise exception 'FAIL CA-04 : le joueur U17 a pu lire le dossier du joueur Pro A';
  end if;
  select * into v_self from public.players where id = 'a0000000-0000-0000-0000-00000000b001';
  if v_self is null then
    raise exception 'FAIL CA-04 : le joueur U17 ne peut pas lire son propre dossier';
  end if;
  insert into res values ('1. isolation joueur A / joueur B', 'PASS');
end $$;
reset role;

-- ── 2. Cantonnement d'équipe du coach (LOT 1) ───────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000a003","role":"authenticated"}';
do $$
declare n_u17 int; n_proa int;
begin
  select count(*) into n_u17 from public.players where id = 'a0000000-0000-0000-0000-00000000b001';
  select count(*) into n_proa from public.players where id = 'a0000000-0000-0000-0000-00000000b002';
  if n_u17 <> 1 then raise exception 'FAIL LOT1 : le coach U17 ne voit pas ses propres joueurs'; end if;
  if n_proa <> 0 then raise exception 'FAIL LOT1 : le coach U17 voit un joueur Pro A (fuite inter-équipes)'; end if;
  insert into res values ('2. cantonnement equipe coach', 'PASS');
end $$;
reset role;

-- ── 3. Dossier médical invisible au coach, visible au médical (CA-06) ───────
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000a003","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.medical_histories where player_id = 'a0000000-0000-0000-0000-00000000b001';
  if n <> 0 then raise exception 'FAIL CA-06 : le coach a pu lire un antecedent medical'; end if;
  insert into res values ('3a. medical invisible au coach', 'PASS');
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000a004","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.medical_histories where player_id = 'a0000000-0000-0000-0000-00000000b001';
  if n <> 1 then raise exception 'FAIL CA-06 : le staff medical ne voit pas l''antecedent qu''il doit voir'; end if;
  insert into res values ('3b. medical visible au medical', 'PASS');
end $$;
reset role;

-- ── 4. Administration réservée aux admins d'organisation ────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000a003","role":"authenticated"}';
do $$
begin
  begin
    perform public.move_player_team('a0000000-0000-0000-0000-00000000b001', null);
    raise exception 'FAIL roster-admin : un coach a pu deplacer un joueur';
  exception when others then
    if sqlerrm not ilike '%administrateur%' then raise; end if;
  end;
  -- Une DELETE bloquée par une policy RESTRICTIVE ne lève pas d'erreur : elle
  -- filtre simplement à 0 ligne. On vérifie donc que le joueur existe toujours.
  declare v_still int;
  begin
    delete from public.players where id = 'a0000000-0000-0000-0000-00000000b001';
    select count(*) into v_still from public.players where id = 'a0000000-0000-0000-0000-00000000b001';
    if v_still = 0 then
      raise exception 'FAIL roster-admin : la suppression directe d''un joueur a reussi pour un coach';
    end if;
  end;
  begin
    perform public.create_team((select org_diambars from ctx), 'Test RLS');
    raise exception 'FAIL team-admin : un coach a pu creer une equipe';
  exception when others then
    if sqlerrm not ilike '%administrateur%' then raise; end if;
  end;
  insert into res values ('4. administration reservee aux admins', 'PASS');
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-00000000a005","role":"authenticated"}';
do $$
declare v_team uuid; v_org uuid;
begin
  select org_diambars into v_org from ctx;
  perform public.move_player_team('a0000000-0000-0000-0000-00000000b001', (select team_proa from ctx));
  v_team := public.create_team(v_org, 'Test RLS temporaire');
  perform public.delete_team(v_team);
  insert into res values ('5. admin autorise (move+create+delete team)', 'PASS');
end $$;
reset role;

select k, v from res order by k;
rollback;
