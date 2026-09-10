-- LOT 1 · F — Durcissement des RPC d'invitation (audit S4, advisor 0028/0029)
--
-- create_* et claim_* ont des gardes internes (auth.uid() requis, rôle admin
-- pour la création) mais restent inutilement exécutables par le rôle 'anon'.
-- On retire 'anon' de ces 4 fonctions.
--
-- validate_player_invite / validate_staff_invite RESTENT ouvertes à 'anon' :
-- la page /join/* les appelle AVANT que l'utilisateur ait un compte, pour
-- afficher « Bienvenue … » et le mail autorisé.

revoke execute on function public.create_player_invite(uuid, text, integer) from anon;
revoke execute on function public.create_staff_invite(uuid, text, text, text, uuid, integer) from anon;
revoke execute on function public.claim_player_invite(text) from anon;
revoke execute on function public.claim_staff_invite(text) from anon;

-- ROLLBACK
-- grant execute on function public.create_player_invite(uuid, text, integer) to anon;
-- grant execute on function public.create_staff_invite(uuid, text, text, text, uuid, integer) to anon;
-- grant execute on function public.claim_player_invite(text) to anon;
-- grant execute on function public.claim_staff_invite(text) to anon;
