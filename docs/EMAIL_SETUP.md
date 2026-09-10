# Envoi des e-mails — invitations & authentification (CA-03)

Deux canaux, un seul fournisseur (Resend) :

| Canal | Sert à | Mécanisme |
|-------|--------|-----------|
| **API Resend** (`/api/invite/send`) | e-mail d'invitation joueur / staff quand le staff valide | route Next.js, clé `RESEND_API_KEY` |
| **SMTP Resend dans Supabase Auth** | confirmation d'e-mail, réinitialisation de mot de passe | SMTP personnalisé Supabase |

Tant que ce n'est pas configuré, l'application **fonctionne quand même** : l'invitation est créée et le
lien s'affiche pour être transmis à la main. Aucune modification de code n'est nécessaire ensuite —
seulement des variables d'environnement.

---

## 1. Domaine d'envoi

N'importe quel registrar convient : il faut seulement pouvoir ajouter des enregistrements DNS
(MX + TXT). Options propres et peu chères :

| Registrar | `.com` / an | Remarque |
|-----------|-------------|----------|
| Cloudflare Registrar | ~10 € | au prix coûtant, DNS excellent |
| Porkbun | ~11 € | WHOIS privé inclus |
| OVHcloud | ~9 € (`.com`), ~7 € (`.fr`) | français, `.fr` crédible pour un club |

À éviter pour la délivrabilité : `.xyz`, `.top`, TLD gratuits.

> Recommandé : `hdyperformancengine.com` (ou `.fr`). Resend conseille d'envoyer depuis un
> **sous-domaine** (`send.hdyperformancengine.com`) pour protéger la réputation du domaine racine.

---

## 2. Resend

1. Créer un compte sur https://resend.com (plan gratuit : 3 000 e-mails/mois, 100/jour).
2. **Domains → Add Domain** → saisir le domaine (ou sous-domaine).
3. Resend affiche 3–4 enregistrements DNS à créer chez le registrar :
   - `MX` sur `send.` (bounce)
   - `TXT` SPF (`v=spf1 include:amazonses.com ~all`)
   - `TXT` DKIM (`resend._domainkey…`)
   - `TXT` DMARC recommandé (`_dmarc` → `v=DMARC1; p=none;`)
4. Attendre la vérification (quelques minutes à 1 h).
5. **API Keys → Create** → portée « Sending access » → copier la clé (`re_…`).

---

## 3. Variables d'environnement (Vercel + `.env.local`)

| Variable | Valeur | Portée |
|----------|--------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` | **serveur** |
| `RESEND_API_KEY` | `re_…` | **serveur** |
| `EMAIL_FROM` | `HDY Performance Engine <invitations@hdyperformancengine.com>` | **serveur** |
| `NEXT_PUBLIC_APP_URL` | `https://<domaine-vercel>` | public |

Dans Vercel : Project → Settings → Environment Variables → ajouter pour Production **et** Preview,
puis redéployer.

---

## 4. SMTP Supabase (confirmation e-mail + reset mot de passe)

Supabase → **Authentication → Emails → SMTP Settings** → *Enable Custom SMTP* :

| Champ | Valeur |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `465` |
| User | `resend` |
| Password | la clé `RESEND_API_KEY` |
| Sender email | `invitations@hdyperformancengine.com` (domaine vérifié) |
| Sender name | `HDY Performance Engine` |

Puis **Authentication → Emails → Templates** : passer les modèles *Confirm signup* et *Reset password*
en français (le contenu par défaut est en anglais).

Sur le plan gratuit sans SMTP personnalisé, Supabase limite à ~2 e-mails/heure — insuffisant pour
82 joueurs. Le SMTP Resend lève cette limite.

---

## 5. Vérification

1. `/admin/roster` → *Envoyer une invitation* sur un joueur ayant un e-mail
   → message « Invitation envoyée à … ✓ ».
2. Resend → **Logs** : l'e-mail apparaît « Delivered ».
3. Ouvrir le lien reçu → `/join/player` → définir le mot de passe → l'e-mail de confirmation Supabase
   arrive → compte actif, redirection vers l'espace joueur.
4. Table `player_invites` : `email_sent_at` renseigné, `email_last_error` nul.
