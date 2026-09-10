import { createClient } from '@supabase/supabase-js';

// Configuration 100 % via variables d'environnement.
// Local : .env.local — Vercel : Project Settings → Environment Variables.
// La clé « publishable » est publique par nature (équivalent anon key) ; la
// sécurité repose sur les politiques RLS Supabase.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Configuration Supabase manquante : définir NEXT_PUBLIC_SUPABASE_URL et ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY (voir docs/DEPLOYMENT.md).',
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
