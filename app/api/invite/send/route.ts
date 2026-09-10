import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail, inviteEmail } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  kind: 'player' | 'staff';
  inviteId: string;
  token: string;
  email: string;
  name?: string;
  orgId: string;
  orgLabel?: string;
};

function appUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, '');
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: 'Corps de requête invalide.' }, { status: 400 });
  }

  const { kind, inviteId, token, email, name, orgId, orgLabel } = body;
  if (!['player', 'staff'].includes(kind) || !inviteId || !token || !email || !orgId) {
    return Response.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return Response.json({ error: 'Authentification requise.' }, { status: 401 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    // Pas de clé service_role configurée : on ne peut pas envoyer, l'UI garde le lien manuel.
    return Response.json({ sent: false, skipped: true, reason: 'server_not_configured' });
  }

  // Identité de l'appelant
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return Response.json({ error: 'Session invalide.' }, { status: 401 });
  }
  const uid = userData.user.id;

  // Droit d'inviter : super-admin OU admin de l'organisation cible
  const [{ data: prof }, { data: mem }] = await Promise.all([
    admin.from('profiles').select('is_super_admin').eq('user_id', uid).maybeSingle(),
    admin
      .from('memberships')
      .select('role')
      .eq('user_id', uid)
      .eq('organization_id', orgId)
      .eq('active', true)
      .maybeSingle(),
  ]);
  const allowed =
    !!prof?.is_super_admin ||
    (mem?.role != null && ['organization_admin', 'module_admin'].includes(mem.role));
  if (!allowed) {
    return Response.json({ error: 'Accès administrateur requis.' }, { status: 403 });
  }

  const table = kind === 'player' ? 'player_invites' : 'staff_invites';

  // Vérifie que l'invitation existe, correspond à l'e-mail, et n'est pas consommée
  const { data: invite, error: invErr } = await admin
    .from(table)
    .select('id,email,used_at,expires_at,email_attempts')
    .eq('id', inviteId)
    .maybeSingle();
  if (invErr || !invite) {
    return Response.json({ error: 'Invitation introuvable.' }, { status: 404 });
  }
  if (invite.used_at) {
    return Response.json({ error: 'Invitation déjà utilisée.' }, { status: 409 });
  }

  const link = `${appUrl(req)}/join/${kind}?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = inviteEmail({
    kind,
    name: name || '',
    link,
    orgLabel: orgLabel || 'HDY Performance Engine',
    expiresAt: invite.expires_at,
  });

  const result = await sendEmail({ to: email, subject, html, text });

  await admin
    .from(table)
    .update({
      email_attempts: (invite.email_attempts ?? 0) + 1,
      email_sent_at: result.ok ? new Date().toISOString() : null,
      email_last_error: result.ok ? null : result.error ?? (result.skipped ? 'email_not_configured' : 'unknown'),
    })
    .eq('id', inviteId);

  if (result.skipped) {
    return Response.json({ sent: false, skipped: true, reason: 'email_not_configured' });
  }
  if (!result.ok) {
    return Response.json({ sent: false, error: result.error || 'Échec de l’envoi.' }, { status: 502 });
  }
  return Response.json({ sent: true, id: result.id });
}
