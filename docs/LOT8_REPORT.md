# LOT 8 — Synchronisation offline (CA-13)

## Objectif
Hooper, RPE et douleur saisissables hors connexion, rejoués **une seule fois** à la reconnexion,
avec un statut visible pour le joueur.

## Migration `20260910203938_lot8_offline_sync` (appliquée + vérifiée)
- `questionnaire_responses`, `session_rpe`, `pain_declarations` :
  `client_uid`, `client_recorded_at`, `tz` ; `source` (`online`/`offline`) ajouté sur RPE et douleur.
- Index **unique partiel** `(player_id, client_uid) where client_uid is not null` sur les 3 tables
  → un rejeu après coupure ne peut pas créer de doublon (violation `23505` traitée comme « déjà enregistré »).

## Code
| Fichier | Rôle |
|---|---|
| `lib/offline-queue.ts` | file IndexedDB persistante : `enqueue` / `flush` / `retryErrors` / `startOfflineSync`. Identifiant local unique, reprise auto (événement `online`, retour d'onglet, toutes les 30 s), purge des saisies synchronisées > 24 h |
| `components/SyncStatus.tsx` | bandeau joueur « en attente de réseau / envoi… / non envoyées + Réessayer » |
| `components/HooperFlow.tsx` | `save()` → `enqueue('hooper', …)` |
| `app/page.tsx` | RPE + douleur → `enqueue(…)` ; liste des séances du jour mise en cache `localStorage` pour la saisie RPE hors ligne ; `<SyncStatus/>` dans l'espace joueur |

Toutes les saisies passent **toujours** par la file : un seul chemin de code, comportement identique
en ligne et hors ligne. La réponse est écrite sur l'appareil puis synchronisée immédiatement si le
réseau est présent.

## Tests automatiques — `lib/offline-queue.test.ts` (Vitest, 5/5 vert)
- saisie en ligne → 1 insertion, `source=online`, statut `synced` ;
- **CA-13** saisie hors ligne → survit, ne part pas ; à la reconnexion → 1 seule insertion, `source=offline` ;
- **CA-13** rejeu « app fermée avant confirmation » → le serveur répond `23505` → pas de doublon ;
- erreur réseau → statut `erreur`, `retryErrors()` renvoie et synchronise ;
- deux saisies distinctes → deux lignes, deux `client_uid`.

`npm test` (script ajouté) · `npm run build` vert.

## Limites connues (assumées, hors périmètre pilote)
- iOS : le service worker est désactivé (choix existant `PWARegister`). La file fonctionne sans lui
  tant que l'onglet/PWA reste ouvert ; le cache d'app hors ligne complet sur iOS est repoussé.
- Politique de conflit : « dernière écriture gagnante » côté serveur n'existe pas — chaque saisie est
  une ligne immuable, donc pas de conflit de contenu, seulement l'anti-doublon.
