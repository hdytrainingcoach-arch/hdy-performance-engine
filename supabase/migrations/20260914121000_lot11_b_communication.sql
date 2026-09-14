-- LOT 11b — Communication staff ↔ joueur
--
-- Module « annonces » : le staff publie un message pour toute l'organisation
-- ou une équipe donnée (convocation, changement d'horaire, information
-- générale) ; les joueurs concernés le voient dans leur appli et leur lecture
-- est tracée (accusé de lecture staff, sans notion de diagnostic ni d'alerte
-- médicale — c'est un canal d'information, pas le dossier médical).

create table public.announcements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  team_id          uuid references public.teams(id) on delete cascade,
  title            text not null,
  body             text not null,
  pinned           boolean not null default false,
  author_user_id   uuid references auth.users(id) on delete set null,
  published_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_announcements_org_date on public.announcements (organization_id, published_at desc);
create index idx_announcements_team_date on public.announcements (team_id, published_at desc);

create table public.announcement_reads (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null references public.announcements(id) on delete cascade,
  player_id        uuid not null references public.players(id) on delete cascade,
  read_at          timestamptz not null default now(),
  unique (announcement_id, player_id)
);

create index idx_announcement_reads_player on public.announcement_reads (player_id);

alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

-- Lecture d'une annonce : participant de l'org, et si elle est ciblée sur une
-- équipe, uniquement l'équipe concernée (même logique que sessions/joueurs).
create policy announcements_read on public.announcements
  for select using (
    (private.is_org_member(organization_id) and (team_id is null or private.can_access_team(team_id)))
    or exists (
      select 1 from public.players p
      where p.user_id = auth.uid()
        and p.organization_id = announcements.organization_id
        and (announcements.team_id is null or p.team_id = announcements.team_id)
    )
  );

create policy announcements_staff_write on public.announcements
  for all
  using (private.is_org_editor(organization_id) and (team_id is null or private.can_access_team(team_id)))
  with check (private.is_org_editor(organization_id) and (team_id is null or private.can_access_team(team_id)));

-- Accusés de lecture : le joueur marque sa propre lecture ; le staff qui a
-- accès à l'annonce peut consulter qui a lu.
create policy announcement_reads_player_write on public.announcement_reads
  for insert
  with check (
    exists (select 1 from public.players p where p.id = announcement_reads.player_id and p.user_id = auth.uid())
  );

create policy announcement_reads_read on public.announcement_reads
  for select using (
    exists (select 1 from public.players p where p.id = announcement_reads.player_id and p.user_id = auth.uid())
    or exists (
      select 1 from public.announcements a
      where a.id = announcement_reads.announcement_id
        and private.is_org_editor(a.organization_id)
        and (a.team_id is null or private.can_access_team(a.team_id))
    )
  );

create trigger trg_touch_announcements
  before update on public.announcements
  for each row execute function private.touch_updated_at();

create trigger trg_audit_announcements
  after insert or update or delete on public.announcements
  for each row execute function private.write_audit();

-- RPC joueur : marquer une annonce comme lue (évite d'exposer l'insert direct
-- avec un player_id arbitraire au client, même si la policy le bloquerait déjà).
create or replace function public.mark_announcement_read(p_announcement_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_player_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select id into v_player_id from public.players where user_id = auth.uid() and active is not false limit 1;
  if v_player_id is null then raise exception 'Aucun dossier joueur lie a ce compte.'; end if;

  insert into public.announcement_reads (announcement_id, player_id)
  values (p_announcement_id, v_player_id)
  on conflict (announcement_id, player_id) do nothing;
end;
$$;
revoke execute on function public.mark_announcement_read(uuid) from public;
grant execute on function public.mark_announcement_read(uuid) to authenticated;
