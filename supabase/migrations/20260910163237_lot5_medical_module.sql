-- LOT 5 — Dossier médical protégé (cahier des charges §4, CA-06)
--
-- 3 tables :
--   medical_histories       : antécédents (1 par joueur) — médical uniquement
--   medical_events          : blessures / événements longitudinaux — médical uniquement
--   player_medical_status   : statut fonctionnel + restrictions PARTAGÉES — lu par le staff
--
-- Le coach / préparateur / joueur ne voient JAMAIS le diagnostic détaillé,
-- uniquement player_medical_status. L'app ne diagnostique pas et n'exclut pas.

-- ── medical_histories ───────────────────────────────────────────────────────
create table public.medical_histories (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  player_id                 uuid not null unique references public.players(id) on delete cascade,
  pathologies               text,
  surgeries                 text,
  hospitalizations          text,
  allergies                 text,
  current_treatments        text,
  contraindications         text,
  concussion_history        text,
  cardio_respiratory_history text,
  observations              text,
  updated_by                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ── medical_events ─────────────────────────────────────────────────────────
create table public.medical_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  player_id        uuid not null references public.players(id) on delete cascade,
  onset_date       date not null,
  context          text check (context in ('training','match','out_of_football','other')),
  body_zone        text,
  laterality       text check (laterality in ('left','right','bilateral','na')),
  pain_level       smallint check (pain_level between 0 and 10),
  mechanism        text check (mechanism in ('contact','non_contact','overload','other')),
  severity         text check (severity in ('minimal','mild','moderate','severe','unknown')),
  diagnosis        text,
  imaging          text,
  clinical_report  text,
  treatment        text,
  restrictions     text,
  surgery          boolean not null default false,
  surgery_detail   text,
  is_recurrence    boolean not null default false,
  recurrence_of    uuid references public.medical_events(id) on delete set null,
  previous_club    text,
  status           text not null default 'open' check (status in ('open','rehab','closed')),
  rtr_expected     date, rtr_actual     date,   -- return to run
  rtt_expected     date, rtt_actual     date,   -- return to training
  rtp_expected     date, rtp_actual     date,   -- return to play
  rtperf_expected  date, rtperf_actual  date,   -- return to performance
  days_out_training integer generated always as (
    case when rtt_actual is not null then (rtt_actual - onset_date) end
  ) stored,
  days_out_play integer generated always as (
    case when rtp_actual is not null then (rtp_actual - onset_date) end
  ) stored,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_medical_events_player on public.medical_events (player_id, onset_date desc);
create index idx_medical_events_org on public.medical_events (organization_id);
create index idx_medical_events_status on public.medical_events (organization_id, status);

-- ── player_medical_status (partagé avec le staff) ──────────────────────────
create table public.player_medical_status (
  player_id            uuid primary key references public.players(id) on delete cascade,
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  availability         text not null default 'full'
                         check (availability in ('full','modified','unavailable','medical_care')),
  shared_restrictions  text,
  expected_return      date,
  active_event_id      uuid references public.medical_events(id) on delete set null,
  updated_by           uuid references auth.users(id) on delete set null,
  updated_at           timestamptz not null default now()
);
create index idx_player_medical_status_org on public.player_medical_status (organization_id, availability);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.medical_histories     enable row level security;
alter table public.medical_events        enable row level security;
alter table public.player_medical_status enable row level security;

-- histories + events : personnel médical uniquement (is_org_medical inclut le super-admin)
create policy medical_histories_medical_only on public.medical_histories
  for all using (private.is_org_medical(organization_id))
  with check (private.is_org_medical(organization_id));

create policy medical_events_medical_only on public.medical_events
  for all using (private.is_org_medical(organization_id))
  with check (private.is_org_medical(organization_id));

-- statut fonctionnel : lu par tout le staff / le joueur concerné, écrit par le médical
create policy player_medical_status_read on public.player_medical_status
  for select using (private.can_access_player(player_id));
create policy player_medical_status_medical_write on public.player_medical_status
  for all using (private.is_org_medical(organization_id))
  with check (private.is_org_medical(organization_id));

-- ── updated_at + audit ─────────────────────────────────────────────────────
create trigger trg_touch_medical_histories before update on public.medical_histories
  for each row execute function private.touch_updated_at();
create trigger trg_touch_medical_events before update on public.medical_events
  for each row execute function private.touch_updated_at();
create trigger trg_touch_player_medical_status before update on public.player_medical_status
  for each row execute function private.touch_updated_at();

create trigger trg_audit_medical_histories after insert or update or delete on public.medical_histories
  for each row execute function private.write_audit();
create trigger trg_audit_medical_events after insert or update or delete on public.medical_events
  for each row execute function private.write_audit();
create trigger trg_audit_player_medical_status after insert or update or delete on public.player_medical_status
  for each row execute function private.write_audit();

-- L'audit médical (avant/après = contenu de la ligne) ne doit être lisible que
-- par le personnel médical, pas par tout le staff.
alter policy audit_admin_read on public.audit_log
using (
  (private.is_super_admin() or private.is_org_staff(organization_id))
  and (
    target_table not in ('medical_histories', 'medical_events')
    or private.is_org_medical(organization_id)
  )
);

-- ── player_documents : le scope 'medical' est déjà réservé au médical (LOT 1 B/H) ──

-- ROLLBACK
-- drop table public.player_medical_status;
-- drop table public.medical_events;
-- drop table public.medical_histories;
