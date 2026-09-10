-- LOT 2a — Correctif : récursion infinie de la policy sur public.organizations.
--
-- organizations_member_read comportait un sous-select « ... join public.organizations o »
-- en ligne (pour trouver l'org parent). Évalué comme l'utilisateur courant, ce
-- select relançait la policy sur organizations → récursion.
-- On déplace toute la logique dans une fonction SECURITY DEFINER.

create or replace function private.org_read_scope()
returns setof uuid
language sql stable security definer set search_path to 'public'
as $$
  select s.org_id from private.membership_scope() s
  union
  select o.parent_organization_id
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid() and m.active = true and o.parent_organization_id is not null
$$;
revoke execute on function private.org_read_scope() from anon;
grant execute on function private.org_read_scope() to authenticated;

alter policy organizations_member_read on public.organizations
using (private.is_super_admin() or id in (select private.org_read_scope()));

-- ROLLBACK
-- alter policy organizations_member_read on public.organizations
--   using (private.is_org_member(id));
-- drop function private.org_read_scope();
