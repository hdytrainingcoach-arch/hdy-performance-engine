-- Durcissement post-advisors (LOT 1.5) :
--   • retire l'accès anon explicite (grant auto Supabase à la création) des RPC
--     de disponibilité — elles exigent auth.uid() de toute façon
--   • fige le search_path de private.touch_updated_at (advisor 0011)

revoke execute on function public.set_my_availability(date, text, text, text, date) from anon;
revoke execute on function public.confirm_availability(uuid, boolean) from anon;

alter function private.touch_updated_at() set search_path to '';

-- ROLLBACK
-- grant execute on function public.set_my_availability(date, text, text, text, date) to anon;
-- grant execute on function public.confirm_availability(uuid, boolean) to anon;
-- alter function private.touch_updated_at() reset search_path;
