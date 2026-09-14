-- LOT 12a — HDY Coach : catégories musculation / préparation physique
--
-- HDY Coach (nouvel espace `/coach`, staff simplifié — sans les modules
-- équipe/organisation multi-marque de HDY Performance Engine) est centré sur
-- la banque d'exercices et la programmation musculation + préparation
-- physique. Les tables `exercises` / `session_exercises` (LOT 11a) sont
-- réutilisées telles quelles — c'est le même club, la même donnée — on
-- élargit seulement :
--   - `exercises.category` : catégories force/hypertrophie/puissance/vitesse/
--     pliométrie/gainage/mobilité/prévention/cardio en plus des catégories
--     existantes (utilisées par l'espace HDY Performance Engine).
--   - `session_exercises.load_type` + `.tempo` : programmation charge
--     (%1RM / RPE / kg / poids de corps) et tempo (ex. « 3-1-1-0 »).

alter table public.exercises drop constraint if exists exercises_category_check;
alter table public.exercises add constraint exercises_category_check check (category in (
  'echauffement','technique','physique','tactique','renforcement','etirement','recuperation','gardien',
  'force','hypertrophie','puissance','vitesse','pliometrie','gainage','mobilite','prevention','cardio'
));

alter table public.session_exercises
  add column if not exists load_type text check (load_type in ('kg','pct_1rm','rpe','poids_corps','autre')),
  add column if not exists tempo text;

comment on column public.session_exercises.load_type is
  'Nature de la charge prescrite : kg, %1RM, RPE, poids de corps, autre — la valeur elle-même reste en texte libre dans load_note.';
comment on column public.session_exercises.tempo is
  'Tempo d''exécution, notation excentrique-pause-concentrique-pause, ex. « 3-1-1-0 ».';
