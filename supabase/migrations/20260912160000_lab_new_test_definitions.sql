-- Nouveaux protocoles HDY LAB : disponibles globalement (organization_id null),
-- donc visibles dans tous les environnements sans ressaisie par organisation.
insert into public.test_definitions (organization_id,name,category,protocol,unit,trial_count,best_rule,config,active)
select null,v.name,v.category,v.protocol,v.unit,v.trial_count,v.best_rule,v.config::jsonb,true
from (values
 ('Asymmetry test','jump','CMJ unipodal gauche puis droit, mêmes conditions d’essai. Déséquilibre = (max-min)/max.','%',2,'custom','{"method":"video_flight_time_unilateral"}'),
 ('Overhead Squat','functional','Squat bras tendus au-dessus de la tête, vue de face et de profil. Score 0-3 selon compensations observées (talons, genoux, tronc, bras).','score',1,'custom','{"criteria":["heels_rise","knees_valgus","forward_lean","arms_fall_forward","asymmetric_shift"]}'),
 ('Overhead Lunge','functional','Fente avant bras tendus au-dessus de la tête, vue de face et de profil. Score 0-3 selon compensations observées.','score',1,'custom','{"criteria":["knee_valgus","trunk_rotation","arms_fall_forward","balance_loss","asymmetric_shift"]}'),
 ('Lateral Overhead Squat','functional','Squat latéral (fentes latérales) bras tendus au-dessus de la tête. Score 0-3 selon compensations observées, comparé gauche/droite.','score',1,'custom','{"criteria":["knee_valgus","trunk_lean","heel_rise","balance_loss"]}'),
 ('VBT - Vitesse concentrique moyenne','vbt','Mesure vidéo de la vitesse moyenne concentrique sur une distance de déplacement connue (barre ou repère).','m/s',1,'max','{"method":"video_distance_time"}'),
 ('Dorsiflexion cheville','mobility','Knee-to-wall ou mesure d’angle au sol avec l’inclinomètre du téléphone, comparé gauche/droite.','deg',2,'max','{"method":"device_orientation"}'),
 ('Angle articulaire (inclinomètre)','mobility','Mesure d’angle générique avec les capteurs du téléphone (ex : inclinaison du tronc en overhead squat, flexion de hanche…). À décrire dans les notes de l’essai.','deg',1,'max','{"method":"device_orientation"}')
) as v(name,category,protocol,unit,trial_count,best_rule,config)
where not exists (select 1 from public.test_definitions d where d.organization_id is null and d.name=v.name);
