-- HDY LAB — Profil Force-Vitesse : schéma dédié (§16 cahier des charges).
--
-- Écart assumé par rapport au cahier des charges littéral : pas de table
-- "athletes" séparée. HDY Performance Engine a déjà une identité athlète
-- (public.players) avec RLS, appartenance d'organisation et dossier
-- longitudinal ; dupliquer cette identité fracturerait le modèle de
-- données existant. fv_tests référence donc player_id.
--
-- leg_length_m est ajouté sur players (donnée stable de l'athlète).
-- push_off_distance_m N'EST PAS ajouté sur players : le cahier des charges
-- est explicite (§3) — elle doit être mesurée par protocole à chaque test,
-- pas estimée une fois pour toutes. Elle vit donc uniquement sur fv_tests.
alter table public.players add column if not exists leg_length_m numeric;

create table if not exists public.fv_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_name text not null,
  model_version text not null unique,
  formula_reference text not null,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

insert into public.fv_model_versions (model_name, model_version, formula_reference, active)
select 'Samozino-Morin Force-Velocity Profile (saut vertical, sauts chargés)', 'Samozino_Morin_FV_v1',
 'F0/V0/Sfv/Pmax par régression linéaire F=a·V+b sur essais chargés. Force moyenne en poussée : F=m·g·(1+h/d) (méthode sans plateforme de force, dérivable par le théorème de l''énergie). Pmax=F0·V0/4. Profil optimal (Sfv_opt) et FV imbalance : EN ATTENTE DE VALIDATION — non implémentés tant que la formule exacte de Samozino et al. 2012 n''a pas été vérifiée sur la publication originale (voir lib/performance/fv/optimalProfile.ts).',
 true
where not exists (select 1 from public.fv_model_versions where model_version='Samozino_Morin_FV_v1');

create table if not exists public.fv_tests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  test_date date not null default current_date,
  test_type text not null default 'vertical' check (test_type in ('vertical','sprint','unilateral','jump','cod')),
  protocol text,
  body_mass_kg numeric not null check (body_mass_kg > 0),
  push_off_distance_m numeric not null check (push_off_distance_m > 0),
  gravity numeric not null default 9.81 check (gravity > 0),
  model_version text not null references public.fv_model_versions(model_version),
  measurement_method text,
  status text not null default 'valid' check (status in ('valid','invalid')),
  f0 numeric,
  v0 numeric,
  sfv numeric,
  pmax numeric,
  pmax_relative numeric,
  sfv_optimal numeric,
  profile_optimal_percent numeric,
  fv_imbalance_percent numeric,
  deficit_type text check (deficit_type in ('force','balanced','velocity','unavailable')),
  r_squared numeric,
  standard_error numeric,
  quality text check (quality in ('HIGH','MEDIUM','LOW')),
  issues jsonb not null default '[]'::jsonb,
  evaluator_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_fv_tests_player_date on public.fv_tests(player_id, test_date desc);

create table if not exists public.fv_trials (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.fv_tests(id) on delete cascade,
  trial_number integer not null,
  additional_load_kg numeric not null check (additional_load_kg >= 0),
  total_mass_kg numeric not null check (total_mass_kg > 0),
  jump_height_m numeric not null check (jump_height_m > 0),
  measurement_method text not null default 'other' check (measurement_method in ('flight_time','direct_measurement','other')),
  velocity_ms numeric,
  force_n numeric,
  force_relative_nkg numeric,
  power_w numeric,
  valid boolean not null default true,
  created_at timestamptz not null default now(),
  unique(test_id, trial_number)
);
create index if not exists idx_fv_trials_test on public.fv_trials(test_id);

alter table public.fv_model_versions enable row level security;
alter table public.fv_tests enable row level security;
alter table public.fv_trials enable row level security;

-- Table de référence des modèles : lecture publique (authentifiée), écriture réservée aux migrations.
create policy fv_model_versions_read on public.fv_model_versions for select using (auth.role() = 'authenticated');

create policy fv_tests_read on public.fv_tests for select using (private.can_access_player(player_id));
create policy fv_tests_write on public.fv_tests for all
  using (private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));

create policy fv_trials_read on public.fv_trials for select using (
  exists (select 1 from public.fv_tests t where t.id = fv_trials.test_id and private.can_access_player(t.player_id))
);
create policy fv_trials_write on public.fv_trials for all
  using (exists (select 1 from public.fv_tests t where t.id = fv_trials.test_id and private.can_access_player(t.player_id)))
  with check (exists (select 1 from public.fv_tests t where t.id = fv_trials.test_id and private.is_org_editor(t.organization_id)));
