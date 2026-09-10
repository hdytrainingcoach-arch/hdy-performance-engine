# Compte rendu — LOT 4 : dashboards & statistiques

*10 septembre 2026. Frontend uniquement, build local vérifié (`next build` OK).*

> Note : une partie de ce lot a été rédigée dans une session Claude dupliquée
> (relancée par erreur au redémarrage). Les deux contributions ne se
> chevauchaient pas (moteur de stats + monitoring d'un côté, comparateur de
> l'autre) et ont été consolidées ici après vérification.

## 1. `lib/stats.ts` — statistiques descriptives partagées

`mean`, `median`, `stddev` (n-1), `percentile`, `pctChange`, `zScore`,
`summarize(série datée)` → dernier / moy. 7 j / moy. 28 j / médiane 28 j / σ 28 j /
écart % / z-score, et `reviewSignal(...)` → statut **vert / orange / rouge / gris**
avec la liste des raisons.

`reviewSignal` suit la grille du cahier des charges §6 :
- **rouge** : symptôme inhabituel, ou douleur ≥ 7/10 ;
- **orange** : douleur ≥ 4/10, ou ≥ 2 signaux dégradés (Hooper nettement au-dessus
  de l'habitude, pic de charge interne vs 7 j, ACWR ≥ 1,30) ;
- **gris** : pas de réponse aujourd'hui / données insuffisantes ;
- **vert** : proche de l'habitude.

C'est un **signal de revue humaine**, jamais un diagnostic ni une exclusion — le
texte le rappelle à l'écran.

## 2. `components/PlayerRollingStats.tsx` — « le joueur comparé à lui-même »

Ajouté au dossier longitudinal (`/admin/sport/players/[id]`). Tableau par
métrique (Hooper, RPE, sRPE, douleur, distance GPS, haute intensité, charge
externe) : dernière valeur, moyennes glissantes 7 j / 28 j, médiane, σ, écart %
vs 28 j, `n`. **Les cases vides affichent « Aucune donnée sur 28 jours » — jamais
une valeur estimée** (CA-10). Bandeau de statut `reviewSignal` en tête.

## 3. Monitoring — colonne « Statut »

`/admin/sport/monitoring` : nouvelle colonne avec une pastille couleur par
athlète (vert/orange/rouge/gris) calculée par `reviewSignal`, info-bulle avec
les raisons. Correction au passage : `pain_declarations` était trié sur
`created_at` (inexistant) au lieu de `declared_at`.

## 4. Dashboard de pilotage — métriques réelles

`/admin/workspace` : « Hooper manquants (auj.) », « Douleurs 7 jours », « Alertes
ouvertes », « sRPE J-1 (total UA) », « Tests enregistrés ». Fenêtres réelles au
lieu de compteurs cumulés.

## 5. Comparateur athlétique — réécriture

`/admin/sport/comparator` lisait des colonnes inexistantes (`test_name`,
`value`). Réécrit : jointure sur `test_definitions` (nom, unité, `best_rule`),
valeur = `best_value ?? mean_value`, tests communs à ≥ 2 athlètes seulement.
Ajout d'un **radar** (`components/RadarChart.tsx`) normalisé par axe, avec
inversion pour les tests où « moins = mieux » (sprints). Données absentes
affichées « non testé ».

## 6. `lib/supabase.ts` — plus de repli

Les variables `NEXT_PUBLIC_SUPABASE_*` sont maintenant sur Vercel : le repli
codé en dur est retiré, le client lève une erreur explicite si la config manque.
(En local : `.env.local`, non versionné.)

## État des critères d'acceptation

| CA | Avant | Après |
|---|---|---|
| CA-10 (données réelles + manquantes signalées) | Partiel | **OK** — « Aucune donnée », « non testé », aucune imputation |
| CA-11 (test comparé) | Partiel (comparateur bogué) | **OK** — comparateur réécrit + radar |

## Réalité des données

Le pilote n'a pas encore généré de données de monitoring : 1 seul joueur a un
historique GPS, 0 questionnaire / séance / RPE / test. Les dashboards sont donc
**corrects mais vides** — ils se rempliront quand les joueurs répondront et que
le staff créera des séances. Ce n'est pas un bug : aucune donnée fictive.
