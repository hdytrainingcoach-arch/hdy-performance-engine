drop policy if exists alerts_member_read on public.alerts;
create policy alerts_access_read on public.alerts
for select
using (
  private.is_org_staff(organization_id)
  or (player_id is not null and private.can_access_player(player_id))
);
