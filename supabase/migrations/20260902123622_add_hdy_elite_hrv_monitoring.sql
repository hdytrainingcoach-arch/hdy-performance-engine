create table if not exists public.hrv_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  measurement_date date not null,
  measured_at timestamptz,
  source text not null default 'csv',
  source_record_id text,
  rmssd_ms numeric,
  ln_rmssd numeric,
  sdnn_ms numeric,
  resting_hr_bpm numeric,
  readiness_score numeric,
  raw_payload jsonb not null default '{}'::jsonb,
  import_batch_id uuid not null default gen_random_uuid(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint hrv_metric_present check (
    rmssd_ms is not null or ln_rmssd is not null or sdnn_ms is not null or resting_hr_bpm is not null or readiness_score is not null
  )
);

create unique index if not exists hrv_records_dedupe_source_idx
  on public.hrv_records(organization_id, player_id, measurement_date, source, coalesce(source_record_id,''));
create index if not exists hrv_records_player_date_idx on public.hrv_records(player_id, measurement_date desc);
create index if not exists hrv_records_org_date_idx on public.hrv_records(organization_id, measurement_date desc);

alter table public.hrv_records enable row level security;

drop policy if exists hrv_records_read on public.hrv_records;
create policy hrv_records_read on public.hrv_records for select using (private.can_access_player(player_id));

drop policy if exists hrv_records_insert_staff on public.hrv_records;
create policy hrv_records_insert_staff on public.hrv_records for insert with check (
  private.is_org_member(organization_id)
  and exists (select 1 from public.players p where p.id=player_id and p.organization_id=organization_id)
);

drop policy if exists hrv_records_update_staff on public.hrv_records;
create policy hrv_records_update_staff on public.hrv_records for update using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));

drop policy if exists hrv_records_delete_staff on public.hrv_records;
create policy hrv_records_delete_staff on public.hrv_records for delete using (private.is_org_member(organization_id));

comment on table public.hrv_records is 'Daily HRV measurements imported primarily by CSV for HDY Elite, correlated with Hooper and session RPE.';
