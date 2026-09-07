# BRIEF D’EXÉCUTION — FINALISATION VISUELLE HDY PERFORMANCE ENGINE

## Objectif
Finaliser aujourd’hui l’UI mobile-first de l’application avec 3 identités clairement séparées :
1. DIAMBARS FC
2. HDY PERFORMANCE ENGINE
3. HDY ELITE

## Règle
Un seul moteur technique HDY, mais 3 expériences visuelles distinctes. Ne pas modifier la logique métier existante sauf si nécessaire pour l’affichage.

## Branding
### DIAMBARS FC
- Noir / rouge / blanc
- Utiliser le logo et le splash Diambars validés
- HDY uniquement en signature discrète : `Powered by HDY Performance Engine`

### HDY PERFORMANCE ENGINE
- Noir / blanc / gris
- Utiliser le logo et le splash HDY validés
- Identité plateforme globale / administration / data

### HDY ELITE
- Identité premium individuelle
- Noir / blanc / gris premium
- Logo HDY rond
- Titre : `HDY ELITE`
- Espace dédié aux joueurs suivis individuellement

## Routes principales
- `/diambars`
- `/hdy`
- `/elite`

Les 3 doivent être installables comme PWA avec nom propre, icône propre, manifest propre, splash propre et `start_url` propre.

## Pages à finaliser
- Administration
- Sport & Performance
- Staff & Accès
- Joueurs
- Dashboard
- GPS
- Questionnaire
- Résultats
- Comparatif
- Accueil joueur HDY Elite

## Design system
Créer / harmoniser les composants communs :
- Header
- Navigation
- Cards
- KPI
- Tables
- Chart containers
- Badges
- Buttons
- Player cards
- Form controls

Créer / utiliser 3 thèmes :
- `theme-diambars`
- `theme-hdy`
- `theme-elite`

## Administration
Afficher : organisation active, équipes, utilisateurs, rôles / permissions, changement d’organisation.
Design : HDY global, sobre et premium.

## Sport & Performance
Afficher : charge, readiness, séances, préparation, alertes.
Design Diambars : noir + rouge.

## Staff & Accès
Afficher : membres, invitations, rôles, permissions, équipes accessibles.
Badges clairs par métier.

## Dashboard staff
Afficher : nombre joueurs, disponibilité, alertes, charge globale, tendances, répartition des statuts.
Design décisionnel très lisible.

## GPS
Afficher : distance, HSR, sprint distance, sprint count, accélérations, décélérations, vitesse max, Player Load, ACWR, graphiques tendance, import Excel / GPS.
Alerte = `à revoir par le staff`, jamais diagnostic automatique.

## Joueurs
Créer : annuaire joueurs, fiche joueur premium, photo, identité, équipe, poste, taille / poids / âge, tests, bien-être, historique, GPS, statut.

## Questionnaire joueur
Mobile-first : Hooper, Foster RPE, durée, douleur, commentaire, sommeil / fatigue / humeur.
Validation rapide, gros boutons.

## Résultats
Afficher : CMJ, Sargent, Broad Jump, Sprint 30 m, autres tests existants, évolution temporelle, meilleurs résultats, graphiques.

## Comparatif
Comparer 2 joueurs : taille, âge, poids, poste, tests physiques, radar, tendances.
Objectif : aide à l’analyse / détection de profils.

## HDY Elite
Créer une vraie home joueur : Bonjour [Prénom], Mon questionnaire, Mes résultats, Mon bien-être, Mes objectifs, Progression, Profil.
Identité premium individuelle différente de Diambars.

## Mobile / iPhone
Tester obligatoirement :
- Safari
- ajout écran d’accueil
- bon nom
- bonne icône
- bon splash
- aucune image cassée
- aucun `?`
- safe-area iPhone
- mode standalone

## Finition
Supprimer :
- anciennes références branding
- icônes obsolètes
- anciens manifests conflictuels
- doubles splash
- textes HDY visibles en gros dans Diambars

## Validation finale
Travail terminé uniquement si :
- `/diambars` fonctionne visuellement
- `/hdy` fonctionne visuellement
- `/elite` fonctionne visuellement
- les 3 PWA sont distinctes
- toutes les pages sont responsive
- aucune erreur build/runtime
- Vercel = READY
- test iPhone validé

## Priorité absolue
VISUEL + MOBILE + STABILITÉ + COHÉRENCE DES 3 IDENTITÉS.

Ne pas ajouter de nouvelles features métier pendant cette phase.