import { createClient } from '@supabase/supabase-js';

// Configuration via variables d'environnement (Vercel / .env.local).
// Les valeurs de repli correspondent au projet pilote actuel et seront
// retirées une fois les variables d'environnement configurées sur Vercel
// (voir docs/DEPLOYMENT.md). La clé « publishable » est publique par nature
// (équivalent anon key), la sécurité repose sur les politiques RLS Supabase.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://kibyxovxqrscpfttjgsy.supabase.co';
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ooirgoJTS8YgV2iQdO_wAg_tvtnLxy4';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
