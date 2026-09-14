# LOT 11 — Parité HEXFIT/MyCoach : programmation, calendrier, charge, communication, tests

## Objectif
Combler les écarts identifiés entre HDY Performance Engine et les plateformes de référence
(HEXFIT, MyCoach) sur cinq axes choisis avec le staff :
1. Programmation d'entraînement (banque d'exercices + contenu de séance) — écart le plus net.
2. Calendrier / planning.
3. Communication staff → joueur.
4. Tests physiques avancés (normes par poste).
5. Corrélation charge interne (sRPE) / charge externe (GPS) au niveau séance.

Le suivi bien-être (Hooper/RPE/douleur), la charge GPS individuelle et l'ACWR, le dossier médical
et le RGPD existaient déjà (LOT 1 → 10) et ne sont pas repris ici.

## Migrations
| Fichier | Contenu |
|---|---|
| `20260914120000_lot11_a_training_programs.sql` | `exercises` (banque, org-scopée), `session_exercises` (contenu prescrit d'une séance : ordre, séries, répétitions, charge, récupération). RLS : lecture participant (staff + joueur de l'équipe concernée, même logique que `sessions_member_read` depuis le correctif 20260912130444), écriture éditeur cantonné à l'équipe de la séance. |
| `20260914121000_lot11_b_communication.sql` | `announcements` (org ou équipe ciblée) + `announcement_reads` (accusé de lecture). RPC `mark_announcement_read`. |
| `20260914122000_lot11_c_calendar_and_norms.sql` | `sessions.location` (calendrier) ; `test_definitions.position_norms` jsonb (tests physiques par poste). Aucune nouvelle table pour le calendrier : vue sur `sessions` + `player_availability` déjà existants. |

## Code — staff (`/admin/sport/…`)
| Page | Rôle |
|---|---|
| `exercises/page.tsx` | Banque d'exercices : CRUD, catégories (échauffement/technique/physique/tactique/renforcement/étirement/récupération/gardien). |
| `sessions/page.tsx` | Ajout d'un modal « Programme » par séance : attacher des exercices de la banque avec séries/répétitions/récup/charge/notes. |
| `calendar/page.tsx` | Vue mois, points colorés par type de séance, badge absences, panneau du jour sélectionné. |
| `communication/page.tsx` | Composer une annonce (organisation ou équipe ciblée, épinglable), liste avec compteur de lecture. |
| `tests/page.tsx` | Norme de référence par poste (bas/haut) éditable par test, comparaison automatique de chaque résultat à la norme du poste du joueur (« sous la norme / dans la norme / au-dessus »). |
| `charge/page.tsx` | Table séance × joueur croisant charge interne (`session_rpe.load_ua`) et charge externe (`gps_records.metrics.external_load`) ; ratio interne/externe et écart (z-score) vs la propre moyenne du joueur, seuil de vigilance affiché (`|z| ≥ 1.5`). |

Toutes ces pages réutilisent `useOrg()` (multi-environnement/équipe déjà existant) et le style/garde
d'accès des pages `sport` récentes (super-admin OU membre staff actif).

## Code — joueur (`app/page.tsx`)
Nouvel onglet **Agenda** (3ᵉ onglet, à côté d'Aujourd'hui/Profil) : séances des 14 prochains jours
avec leur programme d'exercices, et fil des annonces (org + équipe), marquées lues automatiquement
à l'affichage via `mark_announcement_read`.

## Statistiques
`lib/stats.ts` : `loadRatio(internal, external)` — ratio charge interne/externe, `null` si donnée
manquante ou charge externe ≤ 0. Testé dans `lib/stats.test.ts` (4 nouveaux cas, 33/33 vert).

## Tests
- `npm test` (Vitest) : 33/33 vert, dont les 4 nouveaux cas `loadRatio`.
- `npm run build` : vert (32 routes, dont les 4 nouvelles pages `/admin/sport/{exercises,calendar,charge,communication}`).
- `npx tsc --noEmit` : vert.
- `supabase/tests/rls_lot11.sql` : suite rejouable (même format que `rls_isolation.sql`, transaction
  annulée) vérifiant que `session_exercises` suit exactement le périmètre équipe de `sessions`
  (lecture joueur, écriture coach cantonnée) et que les annonces ciblées équipe ne fuitent pas vers
  l'équipe voisine. **Non exécutée dans cet environnement** (pas d'instance Supabase locale
  disponible) — à rejouer avant mise en production, comme les autres suites de ce dossier.

## Limites connues (hors périmètre de ce lot)
- Pas de programmes multi-semaines réutilisables (templates) : le contenu est attaché séance par
  séance. Extension naturelle si le staff en a l'usage.
- Communication : diffusion uniquement (staff → joueurs), pas de messagerie bidirectionnelle.
- Calendrier : pas de récurrence automatique (créer chaque séance individuellement, comme avant).
- Corrélation interne/externe : nécessite un import GPS en mode « Séance » (pas « Historique ») pour
  que `session_id` soit renseigné — c'est déjà la même contrainte que pour l'ACWR automatique (LOT GPS existant).
