update public.test_definitions set protocol='Broad Jump avec utilisation des bras autorisée et standardisée', config = coalesce(config,'{}'::jsonb) || '{"arm_use":"allowed_and_standardized"}'::jsonb where name='Broad Jump';
update public.test_definitions set protocol='CMJ sans utilisation des bras, mains fixées aux hanches, protocole standardisé', config = coalesce(config,'{}'::jsonb) || '{"arm_use":"forbidden","hands":"hips"}'::jsonb where name='CMJ';
update public.test_definitions set protocol='Sprint 30 m départ arrêté standardisé', config = coalesce(config,'{}'::jsonb) || '{"start":"standing_static","flying_start":false}'::jsonb where name='Sprint 30 m';
insert into public.test_definitions (organization_id,name,category,protocol,unit,trial_count,best_rule,config,active)
select null,'Sargent Test','jump','Saut vertical avec utilisation des bras autorisée et standardisée','cm',3,'max','{"arm_use":"allowed_and_standardized"}'::jsonb,true
where not exists (select 1 from public.test_definitions where name='Sargent Test');
update public.test_definitions set active=false, config=coalesce(config,'{}'::jsonb)||'{"status":"pending_protocol_definition"}'::jsonb where category='mobility';
