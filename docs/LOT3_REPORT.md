# Compte rendu — LOT 3 : questionnaires, alertes, mots de passe

*10 septembre 2026. Migration `20260910105249` (appliquée) + front (build local OK).*

## 1. Questionnaire Hooper piloté par la donnée (CA-07)

`components/HooperFlow.tsx` charge le template depuis `questionnaire_templates`
(type `OPR`, actif, dernière version) et **rend les questions depuis la donnée** :
libellés, échelles, nombre d'étapes, score max — plus rien n'est figé dans le
code. Modifier le questionnaire = modifier la ligne en base, sans redéploiement.

Le template Diambars en place : 4 items (Sommeil, Fatigue, Courbatures, Stress),
échelle 1–7, + score total calculé. Conforme à la version demandée.

*Limite connue* : le template est sur l'organisation Diambars. HDY Elite n'en a
pas encore — l'héritage de template depuis l'organisation racine sera ajouté au
LOT 2b / 4.

## 2. Fin du joueur DÉMO fictif

Le faux joueur « Mouhamed Ghazi » avec ses données inventées est supprimé. Un
compte connecté sans dossier joueur voit désormais **« Compte non rattaché —
demande une invitation au staff »**. Conforme au cahier des charges (« jamais de
données fictives »).

## 3. Douleur / symptôme → alerte (CA-09)

Triggers en base (`20260910105249`) :

| Événement | Alerte |
|---|---|
| Douleur déclarée ≥ seuil (défaut **7**, configurable via `organizations.settings.pain_alert_threshold`, héritable) | orange (≥ 7) / rouge (≥ 8) — « à revoir par le staff » |
| Symptôme inhabituel coché au check-in Hooper | orange — « à revoir par le staff » |

**Vérifié en prod** (données temporaires) : douleur 4/10 → rien ; 8/10 → alerte
rouge ; symptôme inhabituel → alerte orange. Aucune exclusion automatique, aucun
diagnostic — uniquement un signal de revue humaine.

## 4. Robustesse des mots de passe (mitigation S6)

`lib/password.ts` : sur `/join/player`, `/join/staff` et `/admin/setup` —
minimum 10 caractères, au moins 3 classes (minuscule / majuscule / chiffre /
symbole), rejet des mots de passe manifestement courants et trop répétitifs.

La vérification HaveIBeenPwned reste réservée au plan Supabase Pro. Combiné à la
règle serveur (longueur + classes, réglée dans le dashboard), c'est une
protection raisonnable pour le pilote.

## État des critères d'acceptation touchés

| CA | Avant | Après |
|---|---|---|
| CA-07 (Hooper configurable/versionné) | ÉCHEC | **OK** (Hooper) — RPE encore à faire |
| CA-09 (douleur ↔ alerte, sans exclusion) | Partiel | **OK** |
| CA-10 (pas de mock) | Partiel | joueur démo supprimé |

## Suite LOT 3 (optionnel / plus tard)

- RPE Foster piloté par la donnée + versionné dans `session_rpe`
- `questionnaire_assignments` (cible, horaires, rappels)
- Héritage de template depuis l'organisation racine
