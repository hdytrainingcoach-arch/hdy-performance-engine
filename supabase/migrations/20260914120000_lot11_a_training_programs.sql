-- LOT 11a — Programmation d'entraînement (banque d'exercices + contenu de séance)
--
-- Jusqu'ici, `sessions` ne portait que le squelette d'une séance (date, durée
-- prévue, RPE prévu) : rien ne décrivait ce que le joueur devait réellement
-- faire. C'est le cœur métier d'HEXFIT (banque d'exercices réutilisable +
-- prescription par séance) qui manquait.
--
-- `exercises`         : banque d'exercices réutilisable, propre à l'organisation.
-- `session_exercises` : contenu prescrit d'une séance donnée (ordre, séries,
--                        répétitions, charge, récupération), rattaché à
--                        `sessions` (LOT 1/1c) déjà scopée équipe.

create table public.exercises (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  category         text not null check (category in
                     ('echauffement','technique','physique','tactique','renforcement','etirement','recuperation','gardien')),
  description      text,
  video_url        text,
  equipment        text,
  target_muscles   text,
  active           boolean not null default true,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_exercises_org on public.exercises (organization_id, active);

create table public.session_exercises (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  session_id       uuid not null references public.sessions(id) on delete cascade,
  exercise_id      uuid not null references public.exercises(id) on delete restrict,
  position         integer not null default 0,
  sets             integer,
  reps             text,
  load_note        text,
  rest_seconds     integer,
  duration_min     integer,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_session_exercises_session on public.session_exercises (session_id, position);

alter table public.exercises enable row level security;
alter table public.session_exercises enable row level security;

-- Banque d'exercices : lisible par tout participant (staff + joueurs, ex.
-- consultation de la technique/vidéo), modifiable par l'éditeur de l'org.
create policy exercises_read on public.exercises
  for select using (private.is_org_participant(organization_id));

create policy exercises_staff_write on public.exercises
  for all
  using (private.is_org_editor(organization_id))
  with check (private.is_org_editor(organization_id));

-- Contenu de séance : même règle de lecture que `sessions` (staff scopé
-- équipe + joueur de l'équipe concernée) — voir 20260912130444, on rejoue
-- exactement la même logique pour éviter de réintroduire le bug déjà corrigé
-- (is_org_member seul ne voit pas les joueurs).
create policy session_exercises_read on public.session_exercises
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_exercises.session_id
        and (
          (private.is_org_member(s.organization_id) and (s.team_id is null or private.can_access_team(s.team_id)))
          or exists (
            select 1 from public.players p
            where p.user_id = auth.uid()
              and p.organization_id = s.organization_id
              and (s.team_id is null or p.team_id = s.team_id)
          )
        )
    )
  );

create policy session_exercises_staff_write on public.session_exercises
  for all
  using (
    private.is_org_editor(organization_id)
    and exists (
      select 1 from public.sessions s
      where s.id = session_exercises.session_id
        and s.organization_id = session_exercises.organization_id
        and (s.team_id is null or private.can_access_team(s.team_id))
    )
  )
  with check (
    private.is_org_editor(organization_id)
    and exists (
      select 1 from public.sessions s
      where s.id = session_exercises.session_id
        and s.organization_id = session_exercises.organization_id
        and (s.team_id is null or private.can_access_team(s.team_id))
    )
  );

create trigger trg_touch_exercises
  before update on public.exercises
  for each row execute function private.touch_updated_at();

create trigger trg_touch_session_exercises
  before update on public.session_exercises
  for each row execute function private.touch_updated_at();

create trigger trg_audit_exercises
  after insert or update or delete on public.exercises
  for each row execute function private.write_audit();

create trigger trg_audit_session_exercises
  after insert or update or delete on public.session_exercises
  for each row execute function private.write_audit();
