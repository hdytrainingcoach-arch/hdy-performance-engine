# Jour 3 — RPE versionné, exports CSV, mapping GPS

## CA-07 / CA-08 — RPE configurable et versionné
- Un template `questionnaire_templates` de type `RPE` (Foster, v2) existait déjà en base mais
  n'était jamais lu par le front : `RPEFlow` avait les libellés figés dans le code.
- Migration `20260911123748_rpe_template_versioning` : `session_rpe` gagne `template_id` +
  `template_version`.
- `RPEFlow` (`app/page.tsx`) est maintenant **piloté par la donnée**, comme `HooperFlow` : échelle,
  libellés et intitulé de la durée viennent du template actif ; chaque réponse enregistre quelle
  version l'a produite. sRPE (`durée × RPE`) inchangé et toujours exact avec plusieurs séances/jour.

## CA-11 / CA-12 — Exports CSV séparés
Nouveau `lib/csv-export.ts` (échappement RFC 4180, BOM pour Excel). Un export par domaine, jamais
un export unique :

| Écran | Bouton | Contenu |
|---|---|---|
| `/admin/roster` | Exporter CSV (profils) | identité, poste, équipe, statut, compte activé — sur les joueurs **visibles/filtrés** |
| `/admin/sport/monitoring` | Export CSV Hooper/RPE | Hooper, RPE, sRPE, douleur, signal — par athlète visible |
| `/admin/sport/monitoring` | Export CSV GPS brut | lignes GPS brutes, **séparées** de Hooper/RPE |
| `/admin/sport/tests` | Exporter CSV | résultats + protocole, sur le périmètre affiché |
| `/admin/medical` | Export CSV médical autorisé | statut fonctionnel + restrictions — écran déjà réservé au médical |

## CA-12 — Import GPS : mapping de colonnes + doublons
`/admin/sport/gps` avait un import CSV/Excel qui devinait les colonnes par alias, sans contrôle
possible. Ajouté :
- **panneau de correspondance des colonnes** : chaque champ cible (date, joueur, distance, HSR,
  sprint, Vmax, acc/dec, durée, RPE historique, charge…) est associé à une colonne du fichier,
  pré-rempli automatiquement et modifiable ;
- **rapport d'erreurs** : compteur des lignes non associées à un joueur, visible dans la barre de
  statut, + export CSV de l'aperçu pour vérification hors écran ;
- **détection de doublons en mode séance** (le mode historique la faisait déjà par date) : un joueur
  déjà importé pour la séance sélectionnée est ignoré et compté, jamais réinséré en double.

## Build & tests
`npm run build` vert · `npm test` (Vitest) 5/5 vert — aucune régression sur la file offline.

## Assumé hors périmètre (raboté, cf. arbitrage "tout couvrir, design en dernier")
- `AdminBrandFrame` / `OrgSplash` résolvent encore la marque via les UUID Diambars/Elite en dur (pas
  `organizations.branding`) et les écrans `manage` / `manage/advanced` / `organizations` gardent leurs
  anciens repères. Sans impact sur le pilote actuel (2 environnements déjà correctement cloisonnés,
  CA-05 ok) — seulement sur l'ajout futur d'un 3ᵉ environnement sans toucher au code. Reporté après
  CA-14/CA-16 qui restent à couvrir avant la fin.
