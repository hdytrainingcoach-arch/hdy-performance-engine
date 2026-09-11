-- RGPD — anonymisation d'un joueur (brief §9 : "suppression ou anonymisation
-- selon règles de conservation"). Contrairement à delete_player (LOT roster_admin,
-- réservé aux doublons SANS aucune donnée), anonymize_player peut être utilisé
-- même quand le joueur a un historique de suivi : l'identité est effacée, les
-- données de monitoring restent (déjà pseudonymes, rattachées à un UUID) pour
-- la continuité des statistiques d'équipe, mais ne pointent plus vers personne.
-- Renvoie l'ancien user_id (s'il existait) pour que l'appelant supprime aussi
-- le compte d'authentification associé (nécessite la clé service_role — géré
-- côté serveur, cette fonction ne touche jamais auth.users).

create or replace function public.anonymize_player(p_player_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid; v_old_user uuid; v_tag text;
begin
  select organization_id, user_id into v_org, v_old_user from public.players where id = p_player_id;
  if v_org is null then raise exception 'Joueur introuvable'; end if;
  if not private.is_org_admin(v_org) then raise exception 'Acces administrateur requis'; end if;

  v_tag := 'anonymise-' || substr(p_player_id::text, 1, 8);

  update public.players set
    first_name = 'Joueur',
    last_name = 'anonymise',
    display_name = 'Joueur anonymisé',
    preferred_name = null,
    email = null,
    phone = null,
    address = null,
    city = null,
    photo_url = null,
    license_number = null,
    id_document_type = null,
    id_document_number = null,
    id_document_expiry = null,
    birth_date = null,
    birth_place = null,
    nationalities = '{}',
    languages = '{}',
    agent_name = null,
    agent_phone = null,
    agent_email = null,
    observation = null,
    external_id = v_tag,
    user_id = null,
    active = false,
    dossier_status = 'anonymise',
    updated_at = now()
  where id = p_player_id;

  -- coordonnées des représentants légaux : mêmes contraintes RGPD
  update public.player_guardians set
    full_name = 'Representant anonymise', phone = null, email = null, address = null
  where player_id = p_player_id;

  return v_old_user;
end;
$$;
revoke all on function public.anonymize_player(uuid) from public, anon;
grant execute on function public.anonymize_player(uuid) to authenticated;
