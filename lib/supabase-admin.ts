import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase à privilèges service_role — SERVEUR UNIQUEMENT.
 * Ne jamais importer ce module dans un composant client : la clé contourne la RLS.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Configuration serveur Supabase manquante (SUPABASE_SERVICE_ROLE_KEY).');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
