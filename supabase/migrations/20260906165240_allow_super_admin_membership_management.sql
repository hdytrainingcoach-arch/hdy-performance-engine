drop policy if exists memberships_super_admin_update on public.memberships;
create policy memberships_super_admin_update
on public.memberships
for update
to authenticated
using (private.is_super_admin())
with check (private.is_super_admin());
