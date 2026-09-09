# Déploiement — HDY Performance Engine

## Vue d'ensemble

| Élément | Valeur |
|---|---|
| Frontend | Next.js 15 (App Router) déployé sur Vercel depuis `main` |
| Base / Auth / Storage | Supabase `kibyxovxqrscpfttjgsy` (`eu-central-1`) |
| PWA | 3 manifests : `/hdy.webmanifest`, `/diambars.webmanifest`, `/elite.webmanifest` |

## Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Environnements | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | `https://kibyxovxqrscpfttjgsy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | Clé publishable Supabase (publique) |

Tant que ces variables ne sont pas définies, `lib/supabase.ts` utilise des
valeurs de repli codées en dur (projet pilote). **Étape suivante :** définir les
variables sur Vercel puis retirer le repli dans `lib/supabase.ts`.

Aucun autre secret ne doit se trouver dans le dépôt. La clé `service_role`
Supabase n'est jamais exposée au client — elle ne servira que dans des routes
serveur / Edge Functions (envoi d'emails d'invitation, URLs signées).

## Base de données

Voir [`supabase/README.md`](../supabase/README.md). Les migrations sont dans
`supabase/migrations/` et font foi.

## En-têtes de sécurité

Définis dans `next.config.ts` (`headers()`). CSP à ajouter au LOT 1 avec un
nonce (les styles inline actuels empêchent une CSP stricte immédiate).
