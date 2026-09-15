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
| `app/coach/layout.tsx` + `components/CoachShell.tsx` | Layout minimal : login, garde d'accès staff, nav (Aujourd'hui/Séances/Modèles/Exercices/Joueurs/Calendrier), sélecteur de périmètre si multi-équipe, lien croisé vers `/admin/sport`. |
| `app/coach/page.tsx` | Accueil : séances du jour / des 7 prochains jours, nombre d'exercices actifs, accès rapides. |
| `app/coach/exercises/page.tsx` | Banque d'exercices groupée par Musculation (force/hypertrophie/puissance/gainage) / Préparation physique (vitesse/pliométrie/mobilité/prévention/cardio) / Échauffement & récupération. |
| `app/coach/sessions/page.tsx` | Créer une séance + modal Programme : séries, répétitions, type de charge (kg/%1RM/RPE/poids de corps), tempo, récupération, application d'un modèle en un clic. |
| `app/coach/templates/page.tsx` | Modèles de programme réutilisables (`program_templates` + `program_template_exercises`) : construire un bloc une fois, l'appliquer à n'importe quelle séance. |
| `app/coach/players/page.tsx` | Suivi individuel du 1RM par joueur × exercice (`player_one_rep_maxes`) + simulateur de charge (60→90 % du dernier 1RM connu). |
| `app/coach/calendar/page.tsx` | Vue mois des séances du périmètre du coach. |

## Migration `20260915090000_lot12_b_one_rep_max.sql` — suivi individuel du 1RM
`player_one_rep_maxes` (organization_id, player_id, exercise_id, value_kg, method
`tested`/`estimated`, recorded_at, notes) : historique en lecture seule (comme `test_results`, pas de
UPDATE — chaque nouvelle valeur est une ligne). RLS : lecture via `private.can_access_player` (même
règle que `test_results`/`gps_records`/`session_rpe` — joueur lui-même + staff scopé équipe), écriture
`private.is_org_editor` + `private.can_access_player`.

`lib/stats.ts` : `suggestedLoadKg(oneRepMax, pct)` — charge suggérée en kg, arrondie au 0,5 kg près,
`null` si donnée manquante. C'est une **suggestion affichée**, jamais injectée automatiquement dans
`session_exercises.load_note` : le coach reste décisionnaire de la charge finale programmée.

## Migration `20260915091000_lot12_c_program_templates.sql` — modèles réutilisables
`program_templates` + `program_template_exercises`, même structure que `session_exercises` mais
détachée d'une séance précise. RLS identique à la banque d'exercices (LOT 11a) : lecture par tout
participant de l'organisation, écriture par l'éditeur. Le modal Programme d'une séance
(`app/coach/sessions/page.tsx`) propose désormais un sélecteur de modèle + « Appliquer » qui copie
son contenu (position, séries, reps, charge, tempo, récup) dans la séance en une insertion groupée.

## Complémentarité avec HDY Performance Engine
Un modèle, un exercice, un 1RM ou une séance créés depuis HDY Coach sont **immédiatement visibles**
côté HDY Performance Engine (même tables, même RLS scopée organisation/équipe) : la séance apparaît
dans `/admin/sport/sessions` et `/admin/sport/calendar`, l'exercice dans `/admin/sport/exercises`.
Liens croisés ajoutés dans les deux sens : `/admin/sport` affiche désormais un bandeau « Ouvrir HDY
Coach → » (à côté de celui vers Administration), et l'en-tête HDY Coach affiche « HDY Performance
Engine → ». Le suivi individuel du 1RM (`/coach/players`) est le pendant HDY Coach du suivi HRV
individuel de HDY Elite (`/admin/sport/hrv`) — même logique : un espace dédié au suivi longitudinal
d'un athlète en particulier, en complément du monitoring d'équipe.

## Tests
`npm test` 36/36 vert (31 dans `lib/stats.test.ts`, dont 4 nouveaux cas `suggestedLoadKg`),
`npx tsc --noEmit` vert, `npm run build` vert — 6 routes `/coach/*` (`page`, `sessions`, `templates`,
`exercises`, `players`, `calendar`).

## Limites connues
- Pas de suggestion automatique du 1RM à partir des `test_results` génériques (ex. un test de force
  standardisé) — c'est un historique dédié, saisi indépendamment.
- Pas de page joueur dédiée HDY Coach : le joueur continue de voir son programme (y compris le
  contenu appliqué depuis un modèle) via l'onglet Agenda de l'espace joueur existant (LOT 11), qui
  lit les mêmes `session_exercises`. Le tempo/type de charge n'y sont pas encore affichés côté joueur.
- Le simulateur de charge (`/coach/players`) affiche des paliers fixes (60→90 %) ; pas encore de
  saisie libre d'un pourcentage arbitraire.
