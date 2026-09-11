-- CA-07 : le RPE doit être configurable et versionné comme le Hooper.
-- Le template 'RPE' (questionnaire_templates) existe déjà côté base ; il manquait
-- la colonne pour tracer quelle version a produit chaque réponse.
alter table public.session_rpe
  add column if not exists template_id      uuid references public.questionnaire_templates(id),
  add column if not exists template_version integer;

comment on column public.session_rpe.template_id is 'Version du questionnaire RPE utilisée (questionnaire_templates, type RPE).';
