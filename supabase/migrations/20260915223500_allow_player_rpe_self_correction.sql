-- Le joueur pouvait insérer son RPE mais pas le corriger : l'app vient de passer à un
-- upsert (ON CONFLICT session_id,player_id DO UPDATE) pour qu'une correction remplace
-- la valeur au lieu d'être silencieusement ignorée par la contrainte unique existante.
-- Il manquait la policy UPDATE correspondante.
create policy srpe_access_update on public.session_rpe
  for update
  using (private.can_access_player(player_id))
  with check (private.can_access_player(player_id));
