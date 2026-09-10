// Envoi d'e-mails transactionnels via Resend (API REST, aucune dépendance).
// SERVEUR UNIQUEMENT. Dégradation propre : sans RESEND_API_KEY, `skipped:true`
// et l'appelant retombe sur le lien à transmettre manuellement.

type SendResult = { ok: boolean; id?: string; error?: string; skipped?: boolean };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM; // ex. "HDY Performance Engine <invitations@hdyperformancengine.com>"
  if (!key || !from) return { ok: false, skipped: true };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur réseau Resend' };
  }
}

const WRAP = (title: string, body: string) => `<!doctype html><html lang="fr"><body style="margin:0;background:#09090b;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#fafafa">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#121214;border:1px solid #2a2a2e;border-radius:18px;padding:28px">
<tr><td style="font-weight:900;font-size:13px;letter-spacing:1.4px;color:#e31e24">HDY PERFORMANCE ENGINE</td></tr>
<tr><td style="padding-top:14px;font-size:22px;font-weight:800;line-height:1.2">${title}</td></tr>
${body}
<tr><td style="padding-top:22px;font-size:11px;color:#71717a;line-height:1.5">Accès nominatif et sécurisé. Si vous n'êtes pas concerné par cette invitation, ignorez cet e-mail.</td></tr>
</table></td></tr></table></body></html>`;

const BTN = (link: string, label: string) =>
  `<tr><td style="padding-top:20px"><a href="${link}" style="display:inline-block;background:#e31e24;color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:13px 22px;border-radius:11px">${label}</a></td></tr>
<tr><td style="padding-top:14px;font-size:12px;color:#a1a1aa;word-break:break-all">Ou copiez ce lien : ${link}</td></tr>`;

export function inviteEmail(opts: {
  kind: 'player' | 'staff';
  name: string;
  link: string;
  orgLabel: string;
  expiresAt: string | Date;
}): { subject: string; html: string; text: string } {
  const exp = new Date(opts.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const hi = opts.name ? `Bonjour ${opts.name},` : 'Bonjour,';

  if (opts.kind === 'player') {
    const subject = `${opts.orgLabel} — activez votre espace joueur`;
    const intro = `${hi}<br><br>Votre dossier a été créé sur <b>${opts.orgLabel}</b>. Activez votre accès personnel pour renseigner votre Hooper du matin, votre RPE après séance et déclarer une douleur si besoin.`;
    const html = WRAP(
      'Activez votre espace joueur',
      `<tr><td style="padding-top:12px;font-size:14px;color:#d4d4d8;line-height:1.6">${intro}</td></tr>${BTN(opts.link, 'Activer mon compte')}<tr><td style="padding-top:16px;font-size:12px;color:#a1a1aa">Lien valable jusqu'au ${exp}. Vous ne verrez que vos propres données.</td></tr>`,
    );
    const text = `${hi}\n\nVotre dossier a été créé sur ${opts.orgLabel}. Activez votre accès personnel :\n${opts.link}\n\nLien valable jusqu'au ${exp}.`;
    return { subject, html, text };
  }

  const subject = `${opts.orgLabel} — invitation staff HDY Performance Engine`;
  const intro = `${hi}<br><br>Vous êtes invité à rejoindre <b>${opts.orgLabel}</b> sur HDY Performance Engine pour le suivi des joueurs et du travail de performance.`;
  const html = WRAP(
    'Invitation staff',
    `<tr><td style="padding-top:12px;font-size:14px;color:#d4d4d8;line-height:1.6">${intro}</td></tr>${BTN(opts.link, 'Activer mon accès staff')}<tr><td style="padding-top:16px;font-size:12px;color:#a1a1aa">Lien nominatif valable jusqu'au ${exp}. Vos permissions sont définies par l'administrateur.</td></tr>`,
  );
  const text = `${hi}\n\nVous êtes invité à rejoindre ${opts.orgLabel} sur HDY Performance Engine.\nActivez votre accès staff :\n${opts.link}\n\nLien valable jusqu'au ${exp}.`;
  return { subject, html, text };
}
