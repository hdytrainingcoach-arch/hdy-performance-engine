create or replace view public.player_comparison_latest with (security_invoker=true) as
select
  p.id as player_id,
  p.organization_id,
  p.team_id,
  p.first_name,
  p.last_name,
  p.display_name,
  p.position,
  p.birth_date,
  case when p.birth_date is not null then round(((current_date - p.birth_date)::numeric / 365.2425),2) end as age_years,
  p.height_cm,
  p.weight_kg,
  case when p.height_cm is not null and p.height_cm > 0 and p.weight_kg is not null then round((p.weight_kg / power(p.height_cm/100.0,2))::numeric,2) end as bmi,
  coalesce(latest.tests,'{}'::jsonb) as latest_tests,
  coalesce(latest.test_count,0) as latest_test_count
from public.players p
left join lateral (
  select jsonb_object_agg(x.test_name, jsonb_build_object(
    'value', x.best_value,
    'unit', x.unit,
    'tested_at', x.tested_at,
    'category', x.category
  )) as tests,
  count(*)::int as test_count
  from (
    select distinct on (td.name)
      td.name as test_name,
      td.unit,
      td.category,
      tr.best_value,
      tr.tested_at
    from public.test_results tr
    join public.test_definitions td on td.id = tr.test_definition_id
    where tr.player_id = p.id
    order by td.name, tr.tested_at desc
  ) x
) latest on true
where p.active=true;

grant select on public.player_comparison_latest to authenticated;
