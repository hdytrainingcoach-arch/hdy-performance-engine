CREATE OR REPLACE FUNCTION private.is_org_member(org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select private.is_super_admin() or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.organization_id = org_id and m.active = true
  )
$function$;
