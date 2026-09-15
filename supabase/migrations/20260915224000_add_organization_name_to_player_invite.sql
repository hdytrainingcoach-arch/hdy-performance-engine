-- /join/player affichait "DIAMBARS FC · ACTIVATION JOUEUR" en dur, quelle que soit
-- l'organisation réelle du joueur invité (un joueur HDY Elite verrait le mauvais club).
-- validate_player_invite ne renvoyait pas le nom d'organisation ; on l'ajoute pour
-- que la page affiche la bonne marque.
drop function if exists public.validate_player_invite(text);

create function public.validate_player_invite(p_token text)
returns table(player_id uuid, display_name text, email text, expires_at timestamptz, used boolean, organization_name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  return query
  select p.id, p.display_name, i.email, i.expires_at, (i.used_at is not null),
         coalesce(o.branding->>'label', o.name)
  from public.player_invites i
  join public.players p on p.id = i.player_id
  join public.organizations o on o.id = p.organization_id
  where i.token_hash = v_hash
    and i.expires_at > now()
  limit 1;
end;
$$;

grant execute on function public.validate_player_invite(text) to anon, authenticated;
