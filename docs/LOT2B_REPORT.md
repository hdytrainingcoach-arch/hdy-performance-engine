# Compte rendu — LOT 2b : white-label frontend

*10 septembre 2026. Frontend uniquement, `next build` vérifié en local.*

## `lib/org-context.tsx`

`OrgProvider` (monté dans `app/admin/layout.tsx`) charge une fois l'arbre
d'organisations + les équipes visibles depuis Supabase (RLS). `useOrg()` expose :

- `environments` — les environnements que l'utilisateur peut voir (enfants de
  l'organisation racine, ou la racine si pas d'enfants) ;
- `currentEnv` / `currentEnvId` / `setCurrentEnvId` — environnement courant,
  mémorisé en `localStorage`, partagé entre toutes les pages ;
- `teamsFor(orgId)` / `usesTeams(orgId)` — équipes réelles d'un environnement ;
- `currentTeamId` / `setCurrentTeamId`.

**Un nouvel environnement client = une ligne dans `organizations` (avec son
`branding`), zéro ligne de code.**

## Pages dé-hardcodées (12)

| Page | Avant | Après |
|---|---|---|
| Sport : monitoring, sessions, tests, gps, hrv, alerts, comparator | `const DIAMBARS/ELITE/TEAMS` en dur | sélecteur « Environnement » = liste réelle ; équipes = `teamsFor()` |
| Admin : workspace, roster, administration/staff, registration | idem | idem |

Détails :
- **HRV** : n'est plus réservé à un id précis mais aux environnements de
  **type `elite_performance`**.
- **Staff & accès** : l'invitation a maintenant un **sélecteur de rôle** (avant :
  `prepa_physique` sur Diambars uniquement) et cible n'importe quel environnement.
- **Effectif** : groupé par les équipes réelles de l'environnement + « Sans équipe ».
- **Inscription** : détection d'équipe à l'import CSV basée sur la liste réelle ;
  thème sombre pour les environnements à équipes, clair sinon.

## Reste (petit, non bloquant)

- `app/admin/manage`, `app/admin/manage/advanced`, `app/admin/organizations` :
  vieux écrans « centre de gestion », en partie redondants avec
  `registration` / `sport/*`. Encore des ids en dur.
- `AdminBrandFrame` / `OrgSplash` : résolvent la marque via `memberships` +
  ids en dur ; à brancher sur `organizations.branding`.

## État des critères d'acceptation

| CA | Après |
|---|---|
| CA-05 (Diambars / Elite cloisonnés visuellement ET techniquement, extensible) | **OK** côté données/navigation — reste le branding dynamique complet |
