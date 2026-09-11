import { createAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Supprime le COMPTE D'AUTHENTIFICATION d'un joueur déjà anonymisé côté base
 * (voir RPC public.anonymize_player). Étape séparée car elle nécessite la clé
 * service_role — jamais exposée au navigateur.
 */
export async function POST(req: Request) {
  let body: { organizationId?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Corps de requête invalide.' }, { status: 400 });
  }
  const { organizationId, userId } = body;
  if (!organizationId || !userId) {
    return Response.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return Response.json({ error: 'Authentification requise.' }, { status: 401 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: 'Suppression du compte non disponible (clé serveur absente).' }, { status: 503 });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return Response.json({ error: 'Session invalide.' }, { status: 401 });
  const callerId = userData.user.id;

  const [{ data: prof }, { data: mem }] = await Promise.all([
    admin.from('profiles').select('is_super_admin').eq('user_id', callerId).maybeSingle(),
    admin.from('memberships').select('role').eq('user_id', callerId).eq('organization_id', organizationId).eq('active', true).maybeSingle(),
  ]);
  const allowed = !!prof?.is_super_admin || (mem?.role != null && ['organization_admin', 'module_admin'].includes(mem.role));
  if (!allowed) return Response.json({ error: 'Accès administrateur requis.' }, { status: 403 });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return Response.json({ error: error.message }, { status: 502 });
  return Response.json({ ok: true });
}
