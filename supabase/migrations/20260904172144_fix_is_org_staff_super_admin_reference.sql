create or replace function private.is_org_staff(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_super_admin() or exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.organization_id = org_id
      and m.active = true
      and m.role <> 'player'
  )
$$;
