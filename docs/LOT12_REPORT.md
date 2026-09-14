# LOT 12 — HDY Coach (nouvel espace `/coach`)

## Objectif
Une application « parallèle » à HDY Performance Engine, dans le même dépôt Next.js : une interface
staff **simplifiée**, centrée sur la banque d'exercices et la **programmation musculation +
préparation physique** — sans les modules équipe/organisation multi-marque (Diambars/Elite,
sélecteur d'environnement) de l'espace `/admin`.

Même backend, mêmes comptes, mêmes tables (`exercises`, `session_exercises`, `sessions`) que HDY
Performance Engine : ce n'est pas un système séparé, c'est une deuxième porte d'entrée plus légère
sur les mêmes données, pour un coach qui n'a pas besoin du reste (GPS, dossier médical, alertes,
multi-équipe).

## Pourquoi « parallèle » et pas un simple sous-dossier de `/admin`
`/admin` est enveloppé dans `AdminBrandFrame` + `OrgProvider` (blanc-marque Diambars/HDY Elite,
sélecteur d'organisation/équipe, thèmes CSS par marque — voir `components/AdminBrandFrame.tsx`).
HDY Coach a son propre layout (`app/coach/layout.tsx`), son propre contexte de périmètre
(`lib/coach-context.tsx`) et sa propre identité visuelle (accent vert `#10B981` vs rouge HDY), servis
sur `/coach/*` en parallèle de `/admin/*` et de l'espace joueur (`/`).

## Résolution de périmètre — `lib/coach-context.tsx`
Contrairement à `useOrg()` (sélecteur d'environnement manuel), `useCoach()` résout automatiquement
l'organisation + l'équipe du coach connecté depuis ses `memberships` actives (rôle ≠ `player`) :
- une seule organisation/équipe → sélection automatique, aucun sélecteur affiché ;
- plusieurs → un simple menu déroulant dans l'en-tête (`org · équipe`), pas de portail multi-marque ;
- aucun accès staff → message « compte non rattaché » + déconnexion ;
- super-admin sans membership directe → première organisation active proposée.

## Migration `20260914130000_lot12_a_coach_strength_conditioning.sql`
Aucune nouvelle table (réutilise `exercises` / `session_exercises` du LOT 11a) :
- `exercises.category` : ajoute `force`, `hypertrophie`, `puissance`, `vitesse`, `pliometrie`,
  `gainage`, `mobilite`, `prevention`, `cardio` aux catégories existantes (rétro-compatible avec la
  banque d'exercices de `/admin/sport/exercises`, qui reste utilisable pour le foot).
- `session_exercises.load_type` (`kg` / `pct_1rm` / `rpe` / `poids_corps` / `autre`) et `.tempo`
  (notation excentrique-pause-concentrique-pause, ex. « 3-1-1-0 ») — programmation force sérieuse.

Aucune policy RLS nouvelle : les tables héritent du scoping équipe déjà vérifié en LOT 11
(`session_exercises_read`/`_staff_write`, `exercises_read`/`_staff_write`).

## Pages
| Route | Rôle |
|---|---|
| `app/coach/layout.tsx` + `components/CoachShell.tsx` | Layout minimal : login, garde d'accès staff, nav (Aujourd'hui/Séances/Exercices/Calendrier), sélecteur de périmètre si multi-équipe. |
| `app/coach/page.tsx` | Accueil : séances du jour / des 7 prochains jours, nombre d'exercices actifs, accès rapides. |
| `app/coach/exercises/page.tsx` | Banque d'exercices groupée par Musculation (force/hypertrophie/puissance/gainage) / Préparation physique (vitesse/pliométrie/mobilité/prévention/cardio) / Échauffement & récupération. |
| `app/coach/sessions/page.tsx` | Créer une séance + modal Programme : séries, répétitions, type de charge (kg/%1RM/RPE/poids de corps), tempo, récupération. |
| `app/coach/calendar/page.tsx` | Vue mois des séances du périmètre du coach. |

## Tests
`npm test` 33/33 vert (inchangé), `npx tsc --noEmit` vert, `npm run build` vert — 4 nouvelles routes
statiques (`/coach`, `/coach/sessions`, `/coach/exercises`, `/coach/calendar`).

## Limites connues
- Pas encore de calcul/suivi automatique du 1RM à partir des `test_results` existants pour suggérrer
  les % de charge — le coach saisit la valeur lui-même dans `load_note`.
- Pas de page joueur dédiée HDY Coach : le joueur continue de voir son programme via l'onglet Agenda
  de l'espace joueur existant (LOT 11), qui lit les mêmes `session_exercises`.
