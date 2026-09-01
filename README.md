# HDY Performance Engine

PWA/mobile-first de monitoring joueur pour HDY Training / Diambars FC.

## MVP actuel
- Authentification Supabase email/mot de passe
- Routage Joueur / Staff via `players.user_id` et `memberships.role`
- Expérience joueur : Aujourd’hui, OPR, RPE, douleur, suivi 7 jours, profil
- Dashboard staff : disponibilité, liste joueurs, statut fonctionnel
- Mode démo pour validation UX sans compte
- Gestion visuelle du mode faible connexion

## Principes produit
- Une action principale par écran
- OPR < 45 s, RPE < 30 s
- Comparaison du joueur à lui-même
- Aucune décision médicale automatique
- Noir/blanc/gris, couleurs réservées aux statuts

## Stack
Next.js + TypeScript + Supabase + Vercel

## Déploiement
Relance de production après correction des réglages Vercel Build & Deployment.
Pipeline GitHub -> Vercel validé en production.

## Finalisation V1
- Création des joueurs par le staff, puis invitation par email au joueur
- Fiche joueur détaillée à la création
- Questionnaire HOOPER le matin
- Questionnaire RPE post-séance
- Dashboard alimenté par les données Supabase réelles
- Deux espaces/équipes distincts dans HDY Performance Engine : Diambars FC et HDY ELITE
- Branding spécifique Diambars FC : noir, rouge, blanc + logo
- CSV GPS : import/export dédié aux données GPS, séparé des questionnaires
- Synchronisation offline à valider et renforcer avant pilote terrain
