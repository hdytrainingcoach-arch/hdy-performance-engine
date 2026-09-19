-- BUG RÉEL : un joueur qui crée son compte via /join/player puis confirme son e-mail
-- pouvait rester "orphelin" (compte confirmé mais jamais relié à son dossier) : le
-- rattachement dépendait d'un appel claim_player_invite(token) fait au bon moment côté
-- navigateur. Constaté sur un vrai joueur (Sidy, confirmé le 2026-09-14, 0 dossier lié)
-- et sur les comptes de test. Il voyait "Compte non encore activé" à chaque connexion.
--
-- Cette fonction rattache, à la connexion, le compte au dossier dont l'invitation
-- (non utilisée, non expirée) porte son adresse e-mail VÉRIFIÉE. Aucun token requis :
-- la preuve de possession de l'adresse est la confirmation Supabase.
create or replace function public.claim_my_player_invite()
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.player_invites%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select lower(email) into v_email
  from auth.users
  where id = v_uid and email_confirmed_at is not null;
  if v_email is null then return null; end if;

  if exists (select 1 from public.players where user_id = v_uid) then return null; end if;

  select * into v_invite
  from public.player_invites
  where lower(email) = v_email and used_at is null and expires_at > now()
  order by created_at desc
  limit 1
  for update;
  if v_invite.id is null then return null; end if;

  update public.players
  set user_id = v_uid, email = v_invite.email
  where id = v_invite.player_id and user_id is null;
  if not found then return null; end if;

  update public.player_invites set used_at = now() where id = v_invite.id;
  return v_invite.player_id;
end;
$$;

revoke all on function public.claim_my_player_invite() from public, anon;
grant execute on function public.claim_my_player_invite() to authenticated;
