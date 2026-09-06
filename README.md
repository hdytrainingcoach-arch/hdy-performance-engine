# HDY Performance Engine

PWA/mobile-first de monitoring joueur pour HDY Training / Diambars FC.

## MVP actuel
- Authentification Supabase email/mot de passe
- Routage Joueur / Staff via `players.user_id` et `memberships.role`
- Expérience joueur : Aujourd’hui, OPR/Hooper, RPE, douleur, suivi 7 jours, profil
- Dashboard staff : monitoring quotidien, GPS, dossiers longitudinaux et alertes de revue
- Import GPS CSV et Excel/Numbers converti en `.xlsx`
- Historique longitudinal individuel et comparaison du joueur à lui-même
- Gestion visuelle du mode faible connexion

## Principes produit
- Une action principale par écran
- OPR < 45 s, RPE < 30 s
- Comparaison du joueur à lui-même
- Les alertes automatiques déclenchent une revue humaine ; elles ne constituent pas un diagnostic ni une exclusion automatique
- Noir/blanc/gris, couleurs réservées aux statuts

## Stack
Next.js + TypeScript + Supabase + Vercel

## Déploiement
Production déployée depuis la branche `main` via GitHub -> Vercel.
Un redéploiement propre a été déclenché le 6 septembre 2026 après correction des builds intermédiaires en erreur. Les anciens déploiements `ERROR` restent dans l’historique Vercel mais ne sont pas servis en production.

## Finalisation V1
- Création des joueurs par le staff, puis invitation sécurisée par email au joueur
- Fiche joueur détaillée et dossier longitudinal
- Questionnaire HOOPER le matin
- Questionnaire RPE post-séance
- Déclaration de douleur
- Dashboard alimenté par les données Supabase réelles
- Deux espaces/équipes distincts dans HDY Performance Engine : Diambars FC et HDY ELITE
- Branding spécifique Diambars FC : noir, rouge, blanc + logo
- GPS : import CSV / Excel, historique, charge externe, charge aiguë 7 j, chronique 28 j et ACWR
- Alertes performance / médicales destinées à une revue staff
- Synchronisation offline à valider et renforcer avant pilote terrain
