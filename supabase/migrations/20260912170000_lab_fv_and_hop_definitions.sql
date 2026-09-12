-- Profil force-vitesse (sauts chargés) et batterie de hop-tests RTP (retour au jeu).
-- Globaux (organization_id null) pour être disponibles dans tous les environnements.
insert into public.test_definitions (organization_id,name,category,protocol,unit,trial_count,best_rule,config,active)
select null,v.name,v.category,v.protocol,v.unit,v.trial_count,v.best_rule,v.config::jsonb,true
from (values
 ('Profil Force-Vitesse (sauts chargés)','force_velocity','CMJ sous charges croissantes (poids de corps + 2 à 4 charges), distance de poussée mesurée. Régression F-V (Samozino).','W/kg',4,'max','{"method":"video_flight_time_loaded"}'),
 ('Single Leg Hop for Distance','jump','Saut unipodal en longueur, réception stable ≥ 2 s, mesuré au mètre ruban. Comparé gauche/droite (LSI).','cm',3,'custom','{"method":"manual_distance","lsi":true}'),
 ('Triple Hop for Distance','jump','Trois sauts unipodaux enchaînés en longueur, distance totale mesurée. Comparé gauche/droite (LSI).','cm',3,'custom','{"method":"manual_distance","lsi":true}'),
 ('Crossover Hop for Distance','jump','Trois sauts unipodaux en zigzag par-dessus une ligne, distance totale mesurée. Comparé gauche/droite (LSI).','cm',3,'custom','{"method":"manual_distance","lsi":true}'),
 ('6m Timed Hop','speed','Saut unipodal répété sur 6 m, temps chronométré. Comparé gauche/droite (LSI).','s',3,'custom','{"method":"video_gate","lsi":true}')
) as v(name,category,protocol,unit,trial_count,best_rule,config)
where not exists (select 1 from public.test_definitions d where d.organization_id is null and d.name=v.name);
