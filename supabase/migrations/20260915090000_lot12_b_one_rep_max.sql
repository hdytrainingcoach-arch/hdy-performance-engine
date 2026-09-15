-- LOT 12b — HDY Coach : suivi du 1RM et suggestion de charge
--
-- La programmation en %1RM (session_exercises.load_type = 'pct_1rm', LOT 12a)
-- reste aujourd'hui une valeur saisie à la main par le coach (ex. « 75 »),
-- sans lien avec la charge réelle du joueur. On ajoute un historique de 1RM
-- par joueur × exercice, pour que l'UI calcule la charge en kg suggérée
-- (%1RM le plus récent × valeur programmée), sans jamais l'imposer comme une
-- vérité automatique — c'est une suggestion, le coach ajuste toujours.

create table public.player_one_rep_maxes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  player_id        uuid not null references public.players(id) on delete cascade,
  exercise_id      uuid not null references public.exercises(id) on delete cascade,
  value_kg         numeric not null check (value_kg > 0),
  method           text not null default 'tested' check (method in ('tested','estimated')),
  recorded_at      timestamptz not null default now(),
  recorded_by      uuid references auth.users(id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now()
);

create index idx_1rm_player_exercise on public.player_one_rep_maxes (player_id, exercise_id, recorded_at desc);
create index idx_1rm_org on public.player_one_rep_maxes (organization_id);

alter table public.player_one_rep_maxes enable row level security;

-- Même règle de lecture que les autres données de performance individuelles
-- (test_results, gps_records, session_rpe…) : private.can_access_player
-- couvre déjà joueur lui-même + staff scopé équipe.
create policy one_rep_maxes_read on public.player_one_rep_maxes
  for select using (private.can_access_player(player_id));

create policy one_rep_maxes_staff_write on public.player_one_rep_maxes
  for all
  using (private.is_org_editor(organization_id) and private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));

create trigger trg_audit_one_rep_maxes
  after insert or update or delete on public.player_one_rep_maxes
  for each row execute function private.write_audit();
