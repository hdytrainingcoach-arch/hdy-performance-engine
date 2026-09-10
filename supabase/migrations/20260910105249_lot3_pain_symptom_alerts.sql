-- LOT 3 — Douleur / symptôme inhabituel → alerte de revue staff
--
-- Cahier des charges §5 / CA-09 : une douleur >= seuil configurable crée une
-- alerte « à revoir par le staff », jamais un diagnostic ni une exclusion.
-- Seuil : organizations.settings->>'pain_alert_threshold' (défaut 7), héritable
-- depuis une organisation ancêtre (hiérarchie LOT 2a).

create or replace function private.effective_org_setting(p_org_id uuid, p_key text)
returns text
language sql stable security definer set search_path to 'public'
as $$
  with recursive chain as (
    select id, parent_organization_id, settings from public.organizations where id = p_org_id
    union all
    select o.id, o.parent_organization_id, o.settings
    from public.organizations o join chain c on o.id = c.parent_organization_id
  )
  select (settings->>p_key)
  from chain
  where settings ? p_key
  limit 1
$$;

-- douleur -> alerte
create or replace function private.pain_to_alert()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  v_threshold numeric := coalesce(
    nullif(private.effective_org_setting(new.organization_id, 'pain_alert_threshold'), '')::numeric,
    7
  );
begin
  if new.intensity is not null and new.intensity >= v_threshold then
    insert into public.alerts (organization_id, player_id, level, reason, related_data, status)
    values (
      new.organization_id, new.player_id,
      case when new.intensity >= 8 then 'red' else 'orange' end,
      format('Douleur déclarée %s/10 — %s%s — à revoir par le staff',
             new.intensity, coalesce(new.zone, 'zone non précisée'),
             case when new.side is not null then ' (' || new.side || ')' else '' end),
      jsonb_build_object(
        'type', 'pain', 'pain_declaration_id', new.id, 'intensity', new.intensity,
        'zone', new.zone, 'side', new.side, 'pain_type', new.pain_type, 'moment', new.moment,
        'rule_version', 'pain_v1', 'threshold', v_threshold
      ),
      'open'
    );
  end if;
  return new;
end;
$$;

create trigger trg_pain_to_alert
  after insert on public.pain_declarations
  for each row execute function private.pain_to_alert();

-- symptôme inhabituel (Hooper) -> alerte
create or replace function private.symptom_to_alert()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if coalesce(new.answers->>'unusual_symptom', 'false') = 'true' then
    insert into public.alerts (organization_id, player_id, level, reason, related_data, status)
    values (
      new.organization_id, new.player_id, 'orange',
      'Symptôme inhabituel signalé au check-in — à revoir par le staff',
      jsonb_build_object(
        'type', 'unusual_symptom', 'questionnaire_response_id', new.id,
        'comment', new.answers->>'comment', 'hooper_total', new.answers->>'hooper_total',
        'rule_version', 'symptom_v1'
      ),
      'open'
    );
  end if;
  return new;
end;
$$;

create trigger trg_symptom_to_alert
  after insert on public.questionnaire_responses
  for each row execute function private.symptom_to_alert();

-- ROLLBACK
-- drop trigger trg_pain_to_alert on public.pain_declarations;
-- drop trigger trg_symptom_to_alert on public.questionnaire_responses;
-- drop function private.pain_to_alert();
-- drop function private.symptom_to_alert();
-- drop function private.effective_org_setting(uuid, text);
