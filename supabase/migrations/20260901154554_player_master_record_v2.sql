-- HDY PERFORMANCE ENGINE - Player master longitudinal record v2
-- Additive and reversible-by-followup migration. No existing data is removed.

alter table public.players
  add column if not exists preferred_name text,
  add column if not exists sex text,
  add column if not exists birth_place text,
  add column if not exists nationalities text[] not null default '{}',
  add column if not exists license_number text,
  add column if not exists id_document_type text,
  add column if not exists id_document_number text,
  add column if not exists id_document_expiry date,
  add column if not exists languages text[] not null default '{}',
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists dossier_status text not null default 'draft',
  add column if not exists is_boarding boolean,
  add column if not exists jersey_number integer,
  add column if not exists category text,
  add column if not exists season text,
  add column if not exists primary_position text,
  add column if not exists secondary_positions text[] not null default '{}',
  add column if not exists dominant_foot text,
  add column if not exists weak_foot_level smallint,
  add column if not exists wingspan_cm numeric,
  add column if not exists club_arrival_date date,
  add column if not exists contract_type text,
  add column if not exists contract_start_date date,
  add column if not exists contract_end_date date,
  add column if not exists promoted_age_group boolean not null default false,
  add column if not exists selections text,
  add column if not exists agent_name text,
  add column if not exists agent_phone text,
  add column if not exists agent_email text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.player_guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  full_name text not null,
  relationship text,
  phone text,
  email text,
  is_legal_representative boolean not null default false,
  is_primary_contact boolean not null default false,
  is_emergency_contact boolean not null default false,
  lives_with_player boolean,
  address text,
  city text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_social_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null unique references public.players(id) on delete cascade,
  living_situation text,
  boarding_entry_date date,
  home_to_center_km numeric,
  usual_transport text,
  administrative_support_needed boolean not null default false,
  administrative_support_notes text,
  authorized_observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_education (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  school_name text,
  school_city text,
  class_level text,
  study_track text,
  diploma_target text,
  school_status text,
  schedule_summary text,
  constraints text,
  school_referent_name text,
  school_referent_phone text,
  school_referent_email text,
  academic_project text,
  professional_project text,
  period_start date,
  period_end date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_club_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  club_name text not null,
  country text,
  city text,
  competition_level text,
  category text,
  season text,
  age_at_club numeric,
  position text,
  matches integer,
  starts integer,
  minutes_played integer,
  goals integer,
  assists integer,
  training_sessions_per_week numeric,
  training_sessions_per_season integer,
  average_session_duration_min integer,
  strength_sessions_per_week numeric,
  tournaments text,
  selections text,
  injuries_summary text,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_training_age (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null unique references public.players(id) on delete cascade,
  organized_football_years numeric,
  training_months_per_year numeric,
  football_sessions_per_week numeric,
  strength_sessions_per_week numeric,
  individual_sessions_per_week numeric,
  matches_per_month numeric,
  other_sports text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_entry_baseline (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  assessment_date date not null default current_date,
  protocol_name text,
  evaluator_name text,
  device text,
  measurements jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.player_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  document_type text not null,
  title text,
  storage_path text not null,
  mime_type text,
  access_scope text not null default 'staff',
  issue_date date,
  expiry_date date,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  consent_type text not null,
  version text not null,
  signer_name text not null,
  signer_relationship text,
  signer_email text,
  accepted boolean not null,
  accepted_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Tighten player isolation: players see self; staff see players in their organization.
create or replace function private.can_access_player(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_super_admin() or exists (
    select 1
    from public.players p
    where p.id = p_id
      and (
        p.user_id = auth.uid()
        or private.is_org_staff(p.organization_id)
      )
  )
$$;

drop policy if exists players_access_read on public.players;
create policy players_access_read on public.players
for select using (
  user_id = auth.uid() or private.is_org_staff(organization_id)
);

-- RLS on new player dossier tables.
alter table public.player_guardians enable row level security;
alter table public.player_social_profiles enable row level security;
alter table public.player_education enable row level security;
alter table public.player_club_history enable row level security;
alter table public.player_training_age enable row level security;
alter table public.player_entry_baseline enable row level security;
alter table public.player_documents enable row level security;
alter table public.consents enable row level security;

create policy player_guardians_read on public.player_guardians for select using (private.can_access_player(player_id));
create policy player_guardians_staff_write on public.player_guardians for all using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));
create policy player_social_read on public.player_social_profiles for select using (private.can_access_player(player_id));
create policy player_social_staff_write on public.player_social_profiles for all using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));
create policy player_education_read on public.player_education for select using (private.can_access_player(player_id));
create policy player_education_staff_write on public.player_education for all using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));
create policy player_club_history_read on public.player_club_history for select using (private.can_access_player(player_id));
create policy player_club_history_staff_write on public.player_club_history for all using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));
create policy player_training_age_read on public.player_training_age for select using (private.can_access_player(player_id));
create policy player_training_age_staff_write on public.player_training_age for all using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));
create policy player_entry_baseline_read on public.player_entry_baseline for select using (private.can_access_player(player_id));
create policy player_entry_baseline_staff_write on public.player_entry_baseline for all using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));
create policy player_documents_read on public.player_documents for select using (
  private.is_org_staff(organization_id)
  or (access_scope = 'player' and private.can_access_player(player_id))
);
create policy player_documents_staff_write on public.player_documents for all using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));
create policy consents_read on public.consents for select using (private.can_access_player(player_id));
create policy consents_staff_write on public.consents for all using (private.is_org_staff(organization_id)) with check (private.is_org_staff(organization_id));

create index if not exists idx_player_guardians_player on public.player_guardians(player_id);
create index if not exists idx_player_education_player on public.player_education(player_id);
create index if not exists idx_player_club_history_player on public.player_club_history(player_id);
create index if not exists idx_player_entry_baseline_player on public.player_entry_baseline(player_id);
create index if not exists idx_player_documents_player on public.player_documents(player_id);
create index if not exists idx_consents_player on public.consents(player_id);
