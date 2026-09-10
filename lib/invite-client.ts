import { supabase } from '@/lib/supabase';

type NotifyResult =
  | { status: 'sent' }
  | { status: 'manual'; reason: string }
  | { status: 'error'; message: string };

/**
 * Demande au serveur d'envoyer l'e-mail d'invitation (joueur ou staff).
 * `manual` = e-mail non configuré ou refusé → l'appelant affiche le lien à copier.
 */
export async function notifyInvite(params: {
  kind: 'player' | 'staff';
  inviteId: string;
  token: string;
  email: string;
  name?: string;
  orgId: string;
  orgLabel?: string;
}): Promise<NotifyResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { status: 'error', message: 'Session expirée.' };

  try {
    const res = await fetch('/api/invite/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.sent) return { status: 'sent' };
    if (data.skipped) return { status: 'manual', reason: data.reason || 'email_not_configured' };
    return { status: 'error', message: data.error || `Échec (${res.status}).` };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Erreur réseau.' };
  }
}
