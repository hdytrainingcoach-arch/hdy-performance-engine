-- LOT 12c — HDY Coach : modèles de programme réutilisables
--
-- Jusqu'ici, le contenu d'une séance (session_exercises, LOT 11a) se
-- reconstruisait exercice par exercice à chaque séance. Un coach qui répète
-- le même bloc force/puissance sur plusieurs semaines devait tout retaper.
-- `program_templates` + `program_template_exercises` capturent un programme
-- réutilisable, applicable en un clic à n'importe quelle séance (staff
-- HDY Performance Engine et HDY Coach partagent la même bibliothèque —
-- complémentarité des deux espaces, même donnée organisation).

create table public.program_templates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  description      text,
  active           boolean not null default true,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_program_templates_org on public.program_templates (organization_id, active);

create table public.program_template_exercises (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  template_id      uuid not null references public.program_templates(id) on delete cascade,
  exercise_id      uuid not null references public.exercises(id) on delete restrict,
  position         integer not null default 0,
  sets             integer,
  reps             text,
  load_type        text check (load_type in ('kg','pct_1rm','rpe','poids_corps','autre')),
  load_note        text,
  tempo            text,
  rest_seconds     integer,
  notes            text,
  created_at       timestamptz not null default now()
);

create index idx_program_template_exercises_template on public.program_template_exercises (template_id, position);

alter table public.program_templates enable row level security;
alter table public.program_template_exercises enable row level security;

-- Même règle que la banque d'exercices (LOT 11a) : lisible par tout
-- participant de l'organisation (staff + joueurs), modifiable par l'éditeur.
create policy program_templates_read on public.program_templates
  for select using (private.is_org_participant(organization_id));

create policy program_templates_staff_write on public.program_templates
  for all
  using (private.is_org_editor(organization_id))
  with check (private.is_org_editor(organization_id));

create policy program_template_exercises_read on public.program_template_exercises
  for select using (private.is_org_participant(organization_id));

create policy program_template_exercises_staff_write on public.program_template_exercises
  for all
  using (private.is_org_editor(organization_id))
  with check (private.is_org_editor(organization_id));

create trigger trg_touch_program_templates
  before update on public.program_templates
  for each row execute function private.touch_updated_at();

create trigger trg_audit_program_templates
  after insert or update or delete on public.program_templates
  for each row execute function private.write_audit();

create trigger trg_audit_program_template_exercises
  after insert or update or delete on public.program_template_exercises
  for each row execute function private.write_audit();
