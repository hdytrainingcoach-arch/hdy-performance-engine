-- LOT 11c — Compléments Calendrier & Tests physiques avancés
--
-- Calendrier : `sessions` porte déjà date/équipe/type, il ne manquait que le
-- lieu pour un vrai planning. Pas de nouvelle table : le calendrier est une
-- vue sur `sessions` + `player_availability` (déjà existants).
--
-- Tests physiques : `test_definitions` a déjà protocole/règle/config ; on
-- ajoute des normes de référence par poste (ex. { "Gardien": {"seuil_bas":..,
-- "seuil_haut":..}, "Défenseur central": {...} }) pour comparer un résultat à
-- un référentiel, comme le fait HEXFIT sur ses tests standardisés.

alter table public.sessions
  add column if not exists location text;

alter table public.test_definitions
  add column if not exists position_norms jsonb not null default '{}'::jsonb;

comment on column public.test_definitions.position_norms is
  'Normes de référence par poste, ex. {"Gardien":{"low":x,"high":y},"Défenseur central":{"low":x,"high":y}}. Purement descriptif — aucune exclusion automatique.';
