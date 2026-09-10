-- LOT 1.5 — Déclaration de disponibilité (présence / absence) par date
--
-- Le joueur déclare, avant l'entraînement, s'il sera présent / absent / en retard /
-- en travail aménagé / en soins au cabinet médical, avec un motif (blessure,
-- maladie, rdv médical, scolaire, familial, personnel, autre).
--
-- Le joueur peut se déclarer « soins » lui-même ; le staff médical doit confirmer
-- (medical_confirmed). Le staff (éditeur) peut aussi déclarer / corriger pour les
-- joueurs de son périmètre équipe.

create table public.player_availability (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  player_id             uuid not null references public.players(id) on delete cascade,
  team_id               uuid references public.teams(id) on delete set null,
  for_date              date not null,
  session_id            uuid references public.sessions(id) on delete set null,
  status                text not null default 'present'
                          check (status in ('present','absent','retard','amenage','soins')),
  reason_category       text
                          check (reason_category in ('blessure','maladie','rdv_medical','scolaire','familial','personnel','autre')),
  comment               text,
  expected_return_date  date,
  medical_confirmed     boolean not null default false,
  medical_confirmed_by  uuid references auth.users(id) on delete set null,
  medical_confirmed_at  timestamptz,
  declared_by           uuid references auth.users(id) on delete set null,
  declared_by_role      text check (declared_by_role in ('player','staff','medical')),
  source                text default 'web',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (player_id, for_date)
);

create index idx_player_availability_player_date on public.player_availability (player_id, for_date desc);
create index idx_player_availability_org_date    on public.player_availability (organization_id, for_date);
create index idx_player_availability_team_date   on public.player_availability (team_id, for_date);

alter table public.player_availability enable row level security;

-- Lecture : joueur concerné + staff de son périmètre équipe (via can_access_player)
create policy player_availability_read on public.player_availability
  for select using (private.can_access_player(player_id));

-- Écriture staff : éditeur de l'org + périmètre équipe
create policy player_availability_staff_write on public.player_availability
  for all
  using (private.is_org_editor(organization_id) and private.can_access_player(player_id))
  with check (private.is_org_editor(organization_id) and private.can_access_player(player_id));

-- ── updated_at ───────────────────────────────────────────────────────────────
create or replace function private.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_player_availability
  before update on public.player_availability
  for each row execute function private.touch_updated_at();

-- ── garde : seul le médical peut (dé)confirmer un statut de soins ─────────────
create or replace function private.guard_availability_medical_confirm()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_was_confirmed boolean := (tg_op = 'UPDATE' and coalesce(old.medical_confirmed, false));
begin
  -- On ne bloque QUE le passage à "confirmé" par un non-médical.
  -- (Le retour à non-confirmé, ex. quand le joueur change de statut, reste permis.)
  if new.medical_confirmed = true
     and v_was_confirmed = false
     and not private.is_org_medical(new.organization_id) then
    raise exception 'Seul le staff medical peut confirmer un statut de soins.';
  end if;
  return new;
end;
$$;

create trigger trg_guard_availability_confirm
  before insert or update on public.player_availability
  for each row execute function private.guard_availability_medical_confirm();

-- ── audit ────────────────────────────────────────────────────────────────────
create trigger trg_audit_player_availability
  after insert or update or delete on public.player_availability
  for each row execute function private.write_audit();

-- ── RPC joueur : déclarer / mettre à jour sa disponibilité pour une date ─────
create or replace function public.set_my_availability(
  p_for_date date,
  p_status text,
  p_reason text default null,
  p_comment text default null,
  p_expected_return date default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_player record;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_for_date is null then raise exception 'Date requise'; end if;

  select id, organization_id, team_id into v_player
  from public.players where user_id = auth.uid() and active is not false
  limit 1;
  if v_player.id is null then raise exception 'Aucun dossier joueur lie a ce compte.'; end if;

  if p_status not in ('present','absent','retard','amenage','soins') then
    raise exception 'Statut invalide.';
  end if;
  if p_reason is not null and p_reason not in
     ('blessure','maladie','rdv_medical','scolaire','familial','personnel','autre') then
    raise exception 'Motif invalide.';
  end if;

  insert into public.player_availability
    (organization_id, player_id, team_id, for_date, status, reason_category,
     comment, expected_return_date, declared_by, declared_by_role, source)
  values
    (v_player.organization_id, v_player.id, v_player.team_id, p_for_date, p_status,
     p_reason, nullif(trim(p_comment), ''), p_expected_return, auth.uid(), 'player', 'web')
  on conflict (player_id, for_date) do update set
    status               = excluded.status,
    reason_category       = excluded.reason_category,
    comment              = excluded.comment,
    expected_return_date = excluded.expected_return_date,
    declared_by          = excluded.declared_by,
    declared_by_role     = 'player',
    -- si le joueur change de statut, la confirmation médicale retombe
    medical_confirmed    = case when public.player_availability.status = excluded.status
                                then public.player_availability.medical_confirmed else false end,
    medical_confirmed_by = case when public.player_availability.status = excluded.status
                                then public.player_availability.medical_confirmed_by else null end,
    medical_confirmed_at = case when public.player_availability.status = excluded.status
                                then public.player_availability.medical_confirmed_at else null end
  returning id into v_id;

  return v_id;
end;
$$;
revoke execute on function public.set_my_availability(date, text, text, text, date) from public;
grant execute on function public.set_my_availability(date, text, text, text, date) to authenticated;

-- ── RPC médical : confirmer / infirmer un statut de soins ────────────────────
create or replace function public.confirm_availability(p_id uuid, p_confirm boolean default true)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select organization_id into v_org from public.player_availability where id = p_id;
  if v_org is null then raise exception 'Declaration introuvable.'; end if;
  if not private.is_org_medical(v_org) then raise exception 'Acces staff medical requis.'; end if;

  update public.player_availability set
    medical_confirmed    = coalesce(p_confirm, true),
    medical_confirmed_by = case when coalesce(p_confirm, true) then auth.uid() end,
    medical_confirmed_at = case when coalesce(p_confirm, true) then now() end
  where id = p_id;
end;
$$;
revoke execute on function public.confirm_availability(uuid, boolean) from public;
grant execute on function public.confirm_availability(uuid, boolean) to authenticated;
