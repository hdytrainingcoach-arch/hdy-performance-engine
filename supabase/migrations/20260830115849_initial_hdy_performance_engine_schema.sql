create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'academy',
  timezone text not null default 'Africa/Dakar',
  branding jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  season text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name, season)
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  role text not null check (role in ('organization_admin','module_admin','team_admin','prepa_physique','coach','staff_medical','player','viewer')),
  permissions jsonb not null default '{}'::jsonb,
  medical_clearance boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id, team_id, role)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  first_name text not null,
  last_name text not null,
  birth_date date,
  position text,
  status text not null default 'disponible' check (status in ('disponible','adapte','re-athletisation','indisponible')),
  height_cm numeric,
  weight_kg numeric,
  photo_url text,
  external_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_players_org_team on public.players(organization_id, team_id);
create index if not exists idx_memberships_user_org on public.memberships(user_id, organization_id);

create table if not exists public.questionnaire_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null,
  version integer not null default 1,
  questions jsonb not null default '[]'::jsonb,
  scales jsonb not null default '{}'::jsonb,
  schedule jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  template_id uuid not null references public.questionnaire_templates(id) on delete restrict,
  template_version integer not null,
  answers jsonb not null,
  source text not null default 'app',
  submitted_at timestamptz not null default now()
);

create index if not exists idx_qr_player_date on public.questionnaire_responses(player_id, submitted_at desc);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  type text not null,
  title text,
  session_date date not null,
  planned_duration_min integer,
  planned_rpe numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.session_rpe (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  rpe numeric not null check (rpe >= 0 and rpe <= 10),
  actual_duration_min integer not null check (actual_duration_min >= 0),
  load_ua numeric generated always as (actual_duration_min * rpe) stored,
  pain_during numeric,
  pain_after numeric,
  comment text,
  submitted_at timestamptz not null default now(),
  unique(session_id, player_id)
);

create table if not exists public.pain_declarations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  zone text not null,
  side text,
  intensity numeric not null check (intensity >= 0 and intensity <= 10),
  pain_type text,
  moment text,
  comment text,
  declared_at timestamptz not null default now()
);

create table if not exists public.gps_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  provider text,
  device_id text,
  metrics jsonb not null default '{}'::jsonb,
  thresholds_version text,
  individualization_method text,
  source text not null default 'csv',
  recorded_at timestamptz not null default now()
);

create table if not exists public.test_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  category text not null,
  protocol text,
  unit text not null,
  trial_count integer not null default 1,
  best_rule text not null default 'max' check (best_rule in ('max','min','mean','custom')),
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  test_definition_id uuid not null references public.test_definitions(id) on delete restrict,
  player_id uuid not null references public.players(id) on delete cascade,
  tested_at timestamptz not null default now(),
  trials jsonb not null default '[]'::jsonb,
  best_value numeric,
  mean_value numeric,
  cv numeric,
  device text,
  evaluator_user_id uuid references auth.users(id) on delete set null,
  context jsonb not null default '{}'::jsonb
);

create index if not exists idx_test_results_player_date on public.test_results(player_id, tested_at desc);

create table if not exists public.player_development_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  domain text not null,
  title text not null,
  description text,
  baseline jsonb not null default '{}'::jsonb,
  target jsonb not null default '{}'::jsonb,
  owner_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('planned','active','completed','paused','cancelled')),
  start_date date,
  review_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.development_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  goal_id uuid not null references public.player_development_goals(id) on delete cascade,
  title text not null,
  action_type text,
  assigned_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  level text not null check (level in ('green','orange','red')),
  reason text not null,
  related_data jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  decision_text text not null,
  comment text,
  decided_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select is_super_admin from public.profiles where user_id = auth.uid()), false)
$$;

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin() or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.organization_id = org_id and m.active = true
  )
$$;

create or replace function public.is_org_staff(org_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin() or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.organization_id = org_id and m.active = true and m.role <> 'player'
  )
$$;

create or replace function public.can_access_player(p_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin() or exists (
    select 1 from public.players p
    where p.id = p_id and (
      p.user_id = auth.uid() or public.is_org_member(p.organization_id)
    )
  )
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.players enable row level security;
alter table public.questionnaire_templates enable row level security;
alter table public.questionnaire_responses enable row level security;
alter table public.sessions enable row level security;
alter table public.session_rpe enable row level security;
alter table public.pain_declarations enable row level security;
alter table public.gps_records enable row level security;
alter table public.test_definitions enable row level security;
alter table public.test_results enable row level security;
alter table public.player_development_goals enable row level security;
alter table public.development_actions enable row level security;
alter table public.alerts enable row level security;
alter table public.decisions enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_self_read on public.profiles for select using (user_id = auth.uid() or public.is_super_admin());
create policy organizations_member_read on public.organizations for select using (public.is_org_member(id));
create policy teams_member_read on public.teams for select using (public.is_org_member(organization_id));
create policy memberships_self_or_staff_read on public.memberships for select using (user_id = auth.uid() or public.is_org_staff(organization_id));
create policy players_access_read on public.players for select using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy players_staff_write on public.players for all using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy qtemplates_member_read on public.questionnaire_templates for select using (public.is_org_member(organization_id));
create policy qtemplates_staff_write on public.questionnaire_templates for all using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy qresponses_access_read on public.questionnaire_responses for select using (public.can_access_player(player_id));
create policy qresponses_player_insert on public.questionnaire_responses for insert with check (public.can_access_player(player_id));
create policy sessions_member_read on public.sessions for select using (public.is_org_member(organization_id));
create policy sessions_staff_write on public.sessions for all using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy srpe_access_read on public.session_rpe for select using (public.can_access_player(player_id));
create policy srpe_access_insert on public.session_rpe for insert with check (public.can_access_player(player_id));
create policy pain_access_read on public.pain_declarations for select using (public.can_access_player(player_id));
create policy pain_access_insert on public.pain_declarations for insert with check (public.can_access_player(player_id));
create policy gps_access_read on public.gps_records for select using (public.can_access_player(player_id));
create policy gps_staff_write on public.gps_records for all using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy testdefs_member_read on public.test_definitions for select using (organization_id is null or public.is_org_member(organization_id));
create policy testdefs_staff_write on public.test_definitions for all using (organization_id is not null and public.is_org_staff(organization_id)) with check (organization_id is not null and public.is_org_staff(organization_id));
create policy testresults_access_read on public.test_results for select using (public.can_access_player(player_id));
create policy testresults_staff_write on public.test_results for all using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy devgoals_access_read on public.player_development_goals for select using (public.can_access_player(player_id));
create policy devgoals_staff_write on public.player_development_goals for all using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy devactions_member_read on public.development_actions for select using (public.is_org_member(organization_id));
create policy devactions_staff_write on public.development_actions for all using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy alerts_member_read on public.alerts for select using (public.is_org_member(organization_id));
create policy alerts_staff_write on public.alerts for all using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy decisions_member_read on public.decisions for select using (public.is_org_member(organization_id));
create policy decisions_staff_write on public.decisions for all using (public.is_org_staff(organization_id)) with check (public.is_org_staff(organization_id));
create policy audit_admin_read on public.audit_log for select using (public.is_super_admin() or public.is_org_staff(organization_id));
