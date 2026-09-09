create schema if not exists private;

alter function public.is_super_admin() set schema private;
alter function public.is_org_member(uuid) set schema private;
alter function public.is_org_staff(uuid) set schema private;
alter function public.can_access_player(uuid) set schema private;

grant usage on schema private to anon, authenticated;
grant execute on function private.is_super_admin() to anon, authenticated;
grant execute on function private.is_org_member(uuid) to anon, authenticated;
grant execute on function private.is_org_staff(uuid) to anon, authenticated;
grant execute on function private.can_access_player(uuid) to anon, authenticated;

create table if not exists public.app_status (
  id smallint primary key default 1 check (id = 1),
  app_name text not null default 'HDY Performance Engine',
  version text not null default '0.2.0-pilot',
  backend_online boolean not null default true,
  auth_required_for_private_data boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.app_status(id, app_name, version, backend_online, auth_required_for_private_data)
values (1, 'HDY Performance Engine', '0.2.0-pilot', true, true)
on conflict (id) do update set version = excluded.version, backend_online = true, auth_required_for_private_data = true, updated_at = now();

alter table public.app_status enable row level security;
drop policy if exists app_status_public_read on public.app_status;
create policy app_status_public_read on public.app_status for select to anon, authenticated using (true);
grant select on public.app_status to anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.profiles(user_id, full_name, is_super_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)),
    lower(coalesce(new.email,'')) = 'hdy.training.coach@gmail.com'
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        is_super_admin = public.profiles.is_super_admin or excluded.is_super_admin;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_hdy on auth.users;
create trigger on_auth_user_created_hdy
after insert on auth.users
for each row execute function private.handle_new_user();

create index if not exists idx_players_user_id on public.players(user_id);
create index if not exists idx_players_team_id on public.players(team_id);
create index if not exists idx_memberships_org on public.memberships(organization_id);
create index if not exists idx_memberships_team on public.memberships(team_id);
create index if not exists idx_sessions_org on public.sessions(organization_id);
create index if not exists idx_sessions_team on public.sessions(team_id);
create index if not exists idx_session_rpe_org on public.session_rpe(organization_id);
create index if not exists idx_session_rpe_player on public.session_rpe(player_id);
create index if not exists idx_gps_org on public.gps_records(organization_id);
create index if not exists idx_gps_session on public.gps_records(session_id);
create index if not exists idx_gps_player on public.gps_records(player_id);
create index if not exists idx_test_results_org on public.test_results(organization_id);
create index if not exists idx_test_results_testdef on public.test_results(test_definition_id);
create index if not exists idx_test_results_evaluator on public.test_results(evaluator_user_id);
create index if not exists idx_dev_goals_org on public.player_development_goals(organization_id);
create index if not exists idx_dev_goals_player on public.player_development_goals(player_id);
create index if not exists idx_dev_goals_owner on public.player_development_goals(owner_user_id);
create index if not exists idx_dev_actions_org on public.development_actions(organization_id);
create index if not exists idx_dev_actions_goal on public.development_actions(goal_id);
create index if not exists idx_dev_actions_assigned on public.development_actions(assigned_user_id);
create index if not exists idx_alerts_org on public.alerts(organization_id);
create index if not exists idx_alerts_player on public.alerts(player_id);
create index if not exists idx_decisions_org on public.decisions(organization_id);
create index if not exists idx_decisions_alert on public.decisions(alert_id);
create index if not exists idx_decisions_author on public.decisions(author_user_id);
create index if not exists idx_audit_org on public.audit_log(organization_id);
create index if not exists idx_audit_actor on public.audit_log(actor_user_id);
create index if not exists idx_pain_org on public.pain_declarations(organization_id);
create index if not exists idx_pain_player on public.pain_declarations(player_id);
create index if not exists idx_qresp_org on public.questionnaire_responses(organization_id);
create index if not exists idx_qresp_template on public.questionnaire_responses(template_id);
create index if not exists idx_qtemplate_org on public.questionnaire_templates(organization_id);
create index if not exists idx_testdefs_org on public.test_definitions(organization_id);
