-- LOT 6 — Journal d'envoi des invitations (joueur + staff).
-- Objectif CA-03 : tracer l'envoi de l'e-mail d'invitation, ses erreurs et ses relances.
-- L'envoi lui-même est fait côté serveur (route Next.js /api/invite/send, clé service_role),
-- qui écrit ces colonnes. Aucune donnée personnelle nouvelle : e-mail déjà présent dans la table.

alter table public.player_invites
  add column if not exists email_sent_at    timestamptz,
  add column if not exists email_attempts   integer not null default 0,
  add column if not exists email_last_error text;

alter table public.staff_invites
  add column if not exists email_sent_at    timestamptz,
  add column if not exists email_attempts   integer not null default 0,
  add column if not exists email_last_error text;

-- Vue de suivi pour l'administration (lecture réservée au staff habilité via RLS des tables sources).
comment on column public.player_invites.email_sent_at is 'Horodatage du dernier envoi e-mail réussi (null = non envoyé / à transmettre manuellement).';
comment on column public.staff_invites.email_sent_at  is 'Horodatage du dernier envoi e-mail réussi (null = non envoyé / à transmettre manuellement).';
