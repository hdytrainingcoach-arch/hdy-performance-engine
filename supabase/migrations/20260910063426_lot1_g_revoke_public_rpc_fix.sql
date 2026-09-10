-- LOT 1 · G — Correctif de F : retirer l'accès PUBLIC (donc anon) des RPC sensibles.
--
-- Dans F, « revoke ... from anon » était sans effet : le rôle anon n'avait pas de
-- grant explicite, il héritait de l'accès accordé à PUBLIC à la création des
-- fonctions. On retire donc PUBLIC et on ré-accorde explicitement à authenticated.
--
-- validate_player_invite / validate_staff_invite conservent leur accès anon
-- (page /join/* appelée avant création de compte).

revoke execute on function public.create_player_invite(uuid, text, integer) from public;
revoke execute on function public.create_staff_invite(uuid, text, text, text, uuid, integer) from public;
revoke execute on function public.claim_player_invite(text) from public;
revoke execute on function public.claim_staff_invite(text) from public;

grant execute on function public.create_player_invite(uuid, text, integer) to authenticated;
grant execute on function public.create_staff_invite(uuid, text, text, text, uuid, integer) to authenticated;
grant execute on function public.claim_player_invite(text) to authenticated;
grant execute on function public.claim_staff_invite(text) to authenticated;

-- ROLLBACK
-- grant execute on function public.create_player_invite(uuid, text, integer) to public;
-- grant execute on function public.create_staff_invite(uuid, text, text, text, uuid, integer) to public;
-- grant execute on function public.claim_player_invite(text) to public;
-- grant execute on function public.claim_staff_invite(text) to public;
