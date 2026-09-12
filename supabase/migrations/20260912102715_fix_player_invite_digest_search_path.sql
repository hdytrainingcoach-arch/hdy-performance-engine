-- BUG CRITIQUE (préexistant, découvert en testant le parcours joueur en conditions
-- réelles) : validate_player_invite et claim_player_invite appellent digest(...)
-- sans le préfixe de schéma, avec search_path = 'public' uniquement (pas 'extensions').
-- pgcrypto vit dans le schéma extensions -> l'appel échoue avec
-- "function digest(text, unknown) does not exist", intercepté côté client en
-- "Lien invalide ou expiré". Conséquence : AUCUN joueur ne pouvait activer son
-- compte via /join/player, quel que soit le lien.
-- Les fonctions équivalentes côté staff (validate_staff_invite, claim_staff_invite,
-- create_staff_invite) qualifient déjà digest() avec extensions. -- corrige
-- le même défaut ici, sans changer la logique.

alter function public.validate_player_invite(text) set search_path = public, extensions;
alter function public.claim_player_invite(text)    set search_path = public, extensions;
