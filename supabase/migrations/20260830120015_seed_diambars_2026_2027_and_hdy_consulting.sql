alter table public.players add column if not exists display_name text;
alter table public.players add column if not exists birth_year integer;
alter table public.players add column if not exists observation text;

insert into public.organizations (name,type,timezone,branding,settings)
select 'Diambars FC','academy','Africa/Dakar','{"theme":"black-white-grey"}'::jsonb,'{"season":"2026-2027"}'::jsonb
where not exists (select 1 from public.organizations where name='Diambars FC');

insert into public.organizations (name,type,timezone,branding,settings)
select 'HDY Consulting','private_coach','Africa/Dakar','{"theme":"black-white-grey"}'::jsonb,'{"mode":"elite_individual"}'::jsonb
where not exists (select 1 from public.organizations where name='HDY Consulting');

with o as (select id from public.organizations where name='Diambars FC' limit 1)
insert into public.teams (organization_id,name,category,season)
select o.id,v.name,v.category,'2026-2027' from o cross join (values
 ('U15','U15'),('U17','U17'),('U19 - PRO B','U19 / Pro B'),('PRO A','Pro A')
) v(name,category)
on conflict (organization_id,name,season) do nothing;

with o as (select id from public.organizations where name='Diambars FC' limit 1),
t as (select id,name from public.teams where organization_id=(select id from o) and season='2026-2027'),
data(team_name,display_name,birth_year,position,observation) as (values
('U15','Pape Diouf',2012,'GB','Conservé dans la projection 2026-2027'),
('U15','Daouda Wade Niang',2012,'GK','Suivi médical / reprise à coordonner'),
('U15','Serigne Ousmane Wagne',2012,'LG','Conservé dans la projection 2026-2027'),
('U15','Cheikh Ndiaye',2012,'MD','Conservé dans la projection 2026-2027'),
('U15','Salif Traoré',2013,'MC','Conservé dans la projection 2026-2027'),
('U15','Alassane Maïga',2013,'MC','Conservé dans la projection 2026-2027'),
('U15','Babacar Sanyang Thiam',2014,'MO','Conservé dans la projection 2026-2027'),
('U15','Mouhamadou Khalilou',2015,'MO','Conservé dans la projection 2026-2027'),
('U15','Khalifa Ababacar Ndoye',2013,'EXG','Conservé dans la projection 2026-2027'),
('U15','Mohamed Diene',2014,'MO','Conservé dans la projection 2026-2027'),
('U17','Mbaye Faye',2012,'LD','Conservé dans la projection 2026-2027'),
('U17','Sandigui Dembele',2012,'LD','Conservé dans la projection 2026-2027'),
('U17','Djiby Niang',2013,'DC','Conservé dans la projection 2026-2027'),
('U17','Fallou Mboup',2012,'DC','Conservé dans la projection 2026-2027'),
('U17','Bara Ndiaye',2012,'DC','Conservé dans la projection 2026-2027'),
('U17','Aboubacar Dembélé',2011,'DC','Conservé dans la projection 2026-2027'),
('U17','Mamadou Pathe Diallo',2011,'MD','Conservé dans la projection 2026-2027'),
('U17','Pape Sene',2012,'MD','Conservé dans la projection 2026-2027'),
('U17','Omar Diarra',2011,'MO','Conservé dans la projection 2026-2027'),
('U17','Mohamed Ghazi',2011,'MO','Conservé dans la projection 2026-2027'),
('U17','Saka Koulibaly',2011,'MO','Conservé dans la projection 2026-2027'),
('U17','Georges Molaire Kanfom',2012,'EX','Conservé dans la projection 2026-2027'),
('U17','Ibrahima Niang',2012,'BU','Conservé dans la projection 2026-2027'),
('U17','Mouhamed Rassoul Soumare',2011,'BU','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Mouhamed Baba Diallo',2010,'GB','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Prosper A. A. Preira',2011,'GB','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Pape Ibrahima Gueye',2012,'DC','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Fallou Fall',2010,'DC','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Modou Ciss',2010,'DC','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Thierno Ousmane Sylla',2011,'LD','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Ismaila Keita',2010,'LD','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Ibrahima Gassama',2011,'LG','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Mamadou Mbaye Ly',2010,'LG','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Youssouph Diatta',2009,'MD','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Vincent Dominique Mane',2008,'MD','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Boubacar Diamanka',2011,'MD','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Tony Mendy',2010,'MO','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Mamadou Banora',2008,'MO','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Cheikh Abdallah',2011,'MO','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Ibrahima Baïlo Ba',2010,'MO','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Boubacar Drame',2010,'EXD','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Andre Bindia',2010,'EXD','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Modou Moustapha Ciss',2010,'EXD','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Ibrahima Faye',2011,'EXD','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Mamadou Bangoura',2011,'EXG','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Fallou Diop',2009,'EXG','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Sitapha Sadio',2009,'BU','Conservé dans la projection 2026-2027'),
('U19 - PRO B','Mouhamed Rassoul Gaye',2009,'BU','Conservé dans la projection 2026-2027'),
('PRO A','Ousseynou Mandian',2006,'GB','Conservé dans la projection 2026-2027'),
('PRO A','Mamadou Diabate Gueye',2009,'GB','Conservé dans la projection 2026-2027'),
('PRO A','Souleymane Solly Ndiaye',2009,'GB','Conservé dans la projection 2026-2027'),
('PRO A','Jean Alpha',null,'DCD','Validé dans l’effectif Pro A'),
('PRO A','Abdou Aziz Sarr',2009,'DCD','Conservé dans la projection 2026-2027'),
('PRO A','Lys Mendy',null,'DCD','Validé dans l’effectif Pro A – année à compléter'),
('PRO A','Mouhamed Junior Ba',2009,'DCD','Conservé dans la projection 2026-2027'),
('PRO A','Cheikh Dieng',2009,'DCG','Conservé dans la projection 2026-2027'),
('PRO A','Ahmadou Bamba Kane',null,'DCG','Conservé dans la projection 2026-2027'),
('PRO A','Alassane Dia',2010,'LD / LG','Conservé dans la projection 2026-2027'),
('PRO A','Lebou',null,'LD','Validé dans l’effectif Pro A'),
('PRO A','Abdou Karim Diallo',2009,'LD','Conservé dans la projection 2026-2027'),
('PRO A','Papa Adama Diallo',2008,'LG','Conservé dans la projection 2026-2027'),
('PRO A','Moussa Ndiaye',2008,'MD','Conservé dans la projection 2026-2027'),
('PRO A','Souleymane Diop',2008,'MD','Conservé dans la projection 2026-2027'),
('PRO A','Mamadou Diop',2009,'MO','Conservé dans la projection 2026-2027'),
('PRO A','Ousmane Ndiaye',2008,'MO','Conservé dans la projection 2026-2027'),
('PRO A','Mouhamed Diagne',2008,'MO','Conservé dans la projection 2026-2027'),
('PRO A','Mahamet Ba',2010,'MO','Conservé dans la projection 2026-2027'),
('PRO A','Mouhamed Wagne',2009,'EXD','Conservé dans la projection 2026-2027'),
('PRO A','Pape Maguette Diouf',2009,'EXD','Conservé dans la projection 2026-2027'),
('PRO A','El Hadji Djiby Diallo',2008,'EXD','Conservé dans la projection 2026-2027'),
('PRO A','Amsatou Diouf',2010,'EXG','Conservé dans la projection 2026-2027'),
('PRO A','Sidy Barhama Ndiaye',2009,'EXG','Conservé dans la projection 2026-2027'),
('PRO A','Mamadou Diop',2007,'BU','Conservé dans la projection 2026-2027'),
('PRO A','Cheikh Cherif Gueye',2009,'BU','Conservé dans la projection 2026-2027'),
('PRO A','Simon',null,'BU','Validé dans l’effectif Pro A')
)
insert into public.players (organization_id,team_id,first_name,last_name,display_name,birth_year,position,observation,external_id)
select (select id from o), t.id, d.display_name, '', d.display_name, d.birth_year, d.position, d.observation,
       lower(replace(replace(d.team_name,' ','-'),'/','-'))||'-'||lpad(row_number() over(partition by d.team_name order by d.display_name)::text,3,'0')
from data d join t on t.name=d.team_name
where not exists (
  select 1 from public.players p where p.organization_id=(select id from o) and p.display_name=d.display_name and p.team_id=t.id and coalesce(p.birth_year,-1)=coalesce(d.birth_year,-1)
);

with o as (select id from public.organizations where name='Diambars FC' limit 1)
insert into public.questionnaire_templates(organization_id,name,type,version,questions,scales,schedule)
select o.id,'OPR Matin','OPR',1,
'[{"key":"opr","label":"Récupération globale","scale":"0-10"},{"key":"sleep_quality","label":"Qualité du sommeil","scale":"1-5"},{"key":"sleep_hours","label":"Heures de sommeil","scale":"hours"},{"key":"fatigue","label":"Fatigue","scale":"1-5"},{"key":"soreness","label":"Douleurs musculaires","scale":"1-5"},{"key":"stress","label":"Stress","scale":"1-5"},{"key":"motivation","label":"Humeur / motivation","scale":"1-5"},{"key":"pain","label":"Douleur","scale":"0-10"},{"key":"symptom","label":"Symptôme inhabituel","scale":"boolean"}]'::jsonb,
'{"opr":{"min":0,"max":10},"wellbeing":{"min":1,"max":5},"pain":{"min":0,"max":10}}'::jsonb,
'{"frequency":"daily","daypart":"morning"}'::jsonb
from o where not exists(select 1 from public.questionnaire_templates q where q.organization_id=o.id and q.type='OPR');

with o as (select id from public.organizations where name='Diambars FC' limit 1)
insert into public.questionnaire_templates(organization_id,name,type,version,questions,scales,schedule)
select o.id,'RPE Post-séance','RPE',1,
'[{"key":"rpe","label":"RPE global","scale":"0-10"},{"key":"duration","label":"Durée réelle","scale":"minutes"},{"key":"pain_during","label":"Douleur pendant","scale":"0-10"},{"key":"pain_after","label":"Douleur après","scale":"0-10"},{"key":"comment","label":"Commentaire","scale":"text"}]'::jsonb,
'{"rpe":{"min":0,"max":10},"pain":{"min":0,"max":10}}'::jsonb,
'{"trigger":"post_session","delay_minutes":25}'::jsonb
from o where not exists(select 1 from public.questionnaire_templates q where q.organization_id=o.id and q.type='RPE');

with o as (select id from public.organizations where name='Diambars FC' limit 1), tests(name,category,unit,trial_count,best_rule,protocol) as (values
('CMJ','jump','cm',3,'max','Protocole standardisé, même échauffement et récupération'),
('Squat Jump','jump','cm',3,'max','Départ position squat sans countermovement'),
('Drop Jump / RSI','jump','RSI',3,'max','Hauteur de chute standardisée, temps de contact + temps de vol'),
('Broad Jump','jump','cm',3,'max','Saut horizontal pieds joints'),
('Sprint 5 m','speed','s',2,'min','Départ standardisé'),('Sprint 10 m','speed','s',2,'min','Départ standardisé'),('Sprint 20 m','speed','s',2,'min','Départ standardisé'),('Sprint 30 m','speed','s',2,'min','Départ standardisé'),('Sprint 40 m','speed','s',2,'min','Départ standardisé'),
('5-0-5','cod','s',2,'min','Avec/sans ballon via contexte'),('Illinois','cod','s',2,'min','Avec/sans ballon via contexte'),
('Demi-Cooper','endurance','m',1,'max','6 minutes'),('Cooper','endurance','m',1,'max','12 minutes'),('VAMEVAL','endurance','km/h',1,'max','Protocole progressif'),('30-15 IFT','endurance','km/h',1,'max','Protocole intermittent'),('Yo-Yo IR1','endurance','m',1,'max','Protocole Yo-Yo IR1'),
('Push-up','strength_endurance','reps',1,'max','Répétitions valides'),('Pull-up','strength_endurance','reps',1,'max','Répétitions valides'),('Dorsiflexion cheville','mobility','deg',2,'max','Knee-to-wall / angle selon mode'),('FMS','functional','score',1,'custom','Score FMS')
)
insert into public.test_definitions(organization_id,name,category,unit,trial_count,best_rule,protocol)
select o.id,t.name,t.category,t.unit,t.trial_count,t.best_rule,t.protocol from o cross join tests t
where not exists(select 1 from public.test_definitions d where d.organization_id=o.id and d.name=t.name);
