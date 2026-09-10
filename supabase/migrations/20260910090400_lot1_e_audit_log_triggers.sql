-- LOT 1 · E — Journal d'audit (audit S9, cahier des charges §9)
--
-- audit_log existait mais n'était jamais écrit. On ajoute un trigger générique
-- AFTER INSERT/UPDATE/DELETE sur les tables sensibles : acteur (auth.uid()),
-- action (INSERT/UPDATE/DELETE), table, id cible, état avant / après.
--
-- Lecture de audit_log : déjà restreinte (policy audit_admin_read : super-admin
-- ou staff de l'org). Le trigger s'exécute en SECURITY DEFINER et contourne RLS
-- pour l'écriture, comme private.handle_new_user.

create or replace function private.write_audit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row   jsonb := to_jsonb(coalesce(new, old));
  v_org   uuid  := nullif(v_row ->> 'organization_id', '')::uuid;
  v_target uuid := nullif(v_row ->> 'id', '')::uuid;
begin
  insert into public.audit_log
    (organization_id, actor_user_id, action, target_table, target_id, before_data, after_data)
  values
    (v_org, auth.uid(), tg_op, tg_table_name, v_target,
     case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
     case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;
comment on function private.write_audit() is
  'Trigger générique : journalise toute écriture sur la table porteuse dans public.audit_log.';

do $$
declare
  t text;
  tables text[] := array[
    'players', 'memberships', 'player_documents', 'consents',
    'alerts', 'decisions', 'questionnaire_templates'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$I', t);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$I
         for each row execute function private.write_audit()', t);
  end loop;
end;
$$;

-- ROLLBACK
-- do $$ declare t text; tables text[] := array['players','memberships','player_documents',
--   'consents','alerts','decisions','questionnaire_templates'];
-- begin foreach t in array tables loop
--   execute format('drop trigger if exists trg_audit_%1$s on public.%1$I', t);
-- end loop; end; $$;
-- drop function private.write_audit();
