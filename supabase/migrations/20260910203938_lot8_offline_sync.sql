-- LOT 8 — Synchronisation offline (CA-13).
-- Hooper / RPE / douleur peuvent être saisis hors connexion puis rejoués une seule fois.
-- Chaque réponse porte un identifiant client unique (client_uid) : un index unique partiel
-- garantit qu'un rejeu après reconnexion ne crée jamais de doublon.
-- On conserve aussi le fuseau et l'heure de saisie côté client, et la source online/offline.

-- questionnaire_responses : 'source' existe déjà (default 'app'). On ajoute le reste.
alter table public.questionnaire_responses
  add column if not exists client_uid         text,
  add column if not exists client_recorded_at timestamptz,
  add column if not exists tz                  text;

alter table public.session_rpe
  add column if not exists client_uid         text,
  add column if not exists client_recorded_at timestamptz,
  add column if not exists tz                  text,
  add column if not exists source              text not null default 'online';

alter table public.pain_declarations
  add column if not exists client_uid         text,
  add column if not exists client_recorded_at timestamptz,
  add column if not exists tz                  text,
  add column if not exists source              text not null default 'online';

create unique index if not exists uq_qresponses_client_uid
  on public.questionnaire_responses (player_id, client_uid) where client_uid is not null;
create unique index if not exists uq_srpe_client_uid
  on public.session_rpe (player_id, client_uid) where client_uid is not null;
create unique index if not exists uq_pain_client_uid
  on public.pain_declarations (player_id, client_uid) where client_uid is not null;

comment on column public.questionnaire_responses.client_uid is 'Identifiant local de la saisie (anti-doublon offline). Unique par joueur.';
comment on column public.session_rpe.client_uid is 'Identifiant local de la saisie (anti-doublon offline). Unique par joueur.';
comment on column public.pain_declarations.client_uid is 'Identifiant local de la saisie (anti-doublon offline). Unique par joueur.';
