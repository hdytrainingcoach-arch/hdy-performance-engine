-- Photo du joueur — bucket privé (mineurs présents dans l'effectif : jamais de
-- bucket public). Chemin : player-photos/<organization_id>/<player_id>/<fichier>
-- Écriture réservée au staff éditeur de l'organisation (is_org_editor, même
-- règle que l'édition du dossier joueur). Lecture réservée à qui peut déjà
-- lire ce joueur (can_access_player) — nécessaire pour générer une URL signée
-- côté client, jamais d'accès public/anonyme.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-photos', 'player-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists player_photos_read on storage.objects;
create policy player_photos_read on storage.objects
  for select using (
    bucket_id = 'player-photos'
    and private.can_access_player(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists player_photos_write on storage.objects;
create policy player_photos_write on storage.objects
  for all
  using (
    bucket_id = 'player-photos'
    and private.is_org_editor(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'player-photos'
    and private.is_org_editor(((storage.foldername(name))[1])::uuid)
  );
