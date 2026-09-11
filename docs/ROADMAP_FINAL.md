# HDY Performance Engine — feuille de route finale (4 jours)

_État au 2026-09-10. Réf. : critères d'acceptation CA-01 → CA-16 du brief v2._

## 1. Où on en est — critères d'acceptation

| CA | Sujet | État | Détail |
|----|-------|------|---------------|
| CA-01 | Création joueur manuelle + persistance | ✅ | — |
| CA-02 | Import CSV sans doublon silencieux | ✅ | dédup e-mail + rapport |
| CA-03 | Invitation joueur par e-mail, e-mail vérifié, MDP récupérable | ✅ | Resend + route serveur (J1) ; reste à poser le domaine + SMTP Supabase côté compte (`docs/EMAIL_SETUP.md`) |
| CA-04 | Un joueur ne voit que ses données | ✅ | vérifié LOT 1 + suite rejouable `supabase/tests/rls_isolation.sql` |
| CA-05 | Diambars / Elite cloisonnés (visuel + technique) | 🟡 | cloisonnement technique ✅ ; branding par écran encore résolu par UUID en dur (`AdminBrandFrame`/`OrgSplash`), sans impact sur le pilote à 2 environnements |
| CA-06 | Médical protégé, coach sans diagnostic | ✅ | LOT 5 + suite rejouable |
| CA-07 | Hooper + RPE configurables et versionnés | ✅ | RPE piloté par template + versionné (J3) |
| CA-08 | sRPE exact, plusieurs séances par jour | ✅ | testé (Vitest + vérif template) |
| CA-09 | Douleur ↔ alerte, aucune exclusion auto | ✅ | LOT 3 |
| CA-10 | Dashboard = données réelles, manquantes visibles | ✅ | LOT 4 ; bug réel corrigé J4 (`toNum(null)` imputait 0) |
| CA-11 | Test physique saisi, comparé, exporté avec protocole | ✅ | export CSV séparé (J3) |
| CA-12 | CSV GPS prévisualisé, mappé, validé, importé, exporté | ✅ | mapping de colonnes + dédup séance + export GPS brut séparé (J3) |
| CA-13 | Réponse offline survit à la fermeture, sync 1×, statut | ✅ | file IndexedDB + anti-doublon, testé (J2) |
| CA-14 | Tests auto (calculs, RLS, imports) | ✅ | Vitest (31 tests) + suite RLS rejouable (J4) |
| CA-15 | Déploiement Vercel documenté, sans secret | ✅ | `docs/DEPLOYMENT.md` |
| CA-16 | Parcours joueur + staff testés mobile + desktop | 🟡 | admin vérifié (build prod, données réelles, mobile+desktop) ; parcours joueur à valider avec un compte réel côté utilisateur |

**Reste ouvert : CA-05 (cosmétique/scalabilité, pas bloquant), CA-16 (parcours joueur à valider avec un vrai compte).**

## 2. Dépendance externe à lever tout de suite

**CA-03 exige un domaine d'envoi vérifié.** `hdyperformancengine.com` n'est pas encore enregistré.
- Idéal : acheter le domaine + créer la clé Resend + poser les enregistrements DNS (SPF/DKIM). ~1 h de propagation.
- Repli si non disponible : envoi via le bac à sable Resend (uniquement vers l'e-mail vérifié du compte) pour les tests internes, bascule vers le vrai domaine = 1 variable d'environnement.

## 3. Plan jour par jour

### Jour 1 — Comptes & invitations (débloque le pilote) → CA-03
- Edge Function `send-invite` (Resend), templates FR.
- Invitation **staff** à la validation de l'inscription (décision Q4).
- Invitation **joueur** à la validation du dossier : lien temporaire, e-mail vérifié, reset MDP (Supabase natif, templates FR).
- Consentement du représentant légal tracé à l'activation d'un mineur.
- Journal des invitations (envoyée / acceptée / expirée).

### Jour 2 — Offline réel → CA-13
- File d'attente IndexedDB pour Hooper / RPE / douleur : identifiant local unique, horodatage, clé d'idempotence.
- Reprise automatique au retour réseau, aucune double réponse.
- Écran joueur « à synchroniser / synchronisé / erreur ».
- Scénarios testés : coupure réseau, fermeture de l'app, reconnexion, doublon, session expirée.
- Note iOS : le service worker est aujourd'hui désactivé sur iOS ; la file fonctionne sans lui (JS + IndexedDB). Décision à prendre sur le cache d'app iOS.

### Jour 3 — Performance & imports → CA-07, CA-08, CA-11, CA-12, CA-05
- RPE piloté par `questionnaire_templates` + versionné (version, fuseau, source online/offline).
- Exports CSV séparés : profils · Hooper/RPE · tests · GPS brut · médical autorisé — sur données filtrées visibles.
- Import GPS : étape de mapping de colonnes explicite + rapport d'erreurs + unités.
- Fin LOT 2b : branding depuis `organizations.branding` (`AdminBrandFrame`, `OrgSplash`) ; écrans `manage` / `organizations`.

### Jour 4 — Conformité, tests, QA → CA-14, CA-16
- Vitest : sRPE, stats glissantes (`lib/stats`), règle douleur→alerte.
- Tests RLS d'isolation rejouables (joueur A ≠ joueur B, équipe, médical).
- RGPD : export des données d'un joueur, anonymisation/suppression avec conservation de l'historique, page consentements.
- CSP avec nonce + safe-area sur l'admin (LOT 9 réduit).
- QA parcours complet joueur + staff, mobile + desktop, sur l'app déployée.
- Compte rendu final + doc de prise en main (staff + joueur).

## 3bis. Ajouté en cours de route (demandes utilisateur, hors plan initial)

- **Gestion de l'effectif** : déplacer un joueur d'équipe (surclassement), désactiver (garde
  l'historique), supprimer un doublon (refusé si des données existent).
- **Gestion des équipes** : créer/renommer/archiver/supprimer une équipe depuis `/admin/roster` —
  répond à « pourra-t-on ajouter plusieurs équipes ? » : oui, sans code, depuis l'écran.
- **RGPD** : anonymisation d'un joueur (identité effacée, historique de suivi pseudonyme conservé,
  compte supprimé) + export personnel des données côté joueur.

## 4. Ce qui saute si le temps manque (assumé, hors périmètre pilote)
- Design system complet → réduit au strict : CSP, safe-area, contrôle des contrastes.
- Avatar anatomique douleur face/dos → on garde la sélection de zone par boutons.
- Historisation fine des seuils GPS individualisés → v2.
- Protection « mots de passe compromis » (HIBP) → attend Supabase Pro (mitigation déjà en place : longueur + classes de caractères).
- Sauvegardes quotidiennes / restauration testée → attend Supabase Pro.
