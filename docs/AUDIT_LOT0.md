# AUDIT LOT 0 — HDY Performance Engine

*État des lieux avant reprise du développement. Rédigé le 9 septembre 2026.*
*Référentiel : `HDY_PERFORMANCE_ENGINE_Brief_Developpeur_IA_v2.pdf` (v2.0, 1 sept. 2026) + `docs/CODEX_FINAL_VISUAL_EXECUTION.md`.*

Commit audité : `9754dea` (branche `main`).

---

## 1. Méthode & accès

| Ressource | Accès obtenu | Note |
|---|---|---|
| Dépôt GitHub `hdytrainingcoach-arch/hdy-performance-engine` | Lecture seule (clone HTTPS public) | **Pas d'accès en écriture** — bloquant pour livrer. Token PAT à fournir. |
| Supabase `kibyxovxqrscpfttjgsy` (« HDY Performance Engine », `eu-central-1`) | Complet via MCP (schéma, RLS, fonctions, advisors, SQL) | 2e projet `ourengmvywtdmkdxoifz` INACTIVE, non utilisé. |
| Vercel | MCP connecté mais compte Hobby sans `teamId` — `list_projects` échoue | À rouvrir avec l'ID projet Vercel. Prod déclarée « Ready » d'après le README. |
| Build / tests locaux | **Impossible** : ni `node` ni `npm` sur la machine | Vérification build = via déploiement Vercel uniquement pour l'instant. |

Vérifications faites : décodage réel du schéma Postgres, lecture de toutes les policies RLS et de toutes les fonctions `public`/`private`, advisors sécurité + performance, lecture intégrale des 1 651 lignes de code source (`app/`, `components/`, `lib/`), requêtes SQL sur les données réelles.

---

## 2. État de l'existant

### 2.1 Dépôt & stack

- **Next.js 15.5 (App Router) + React 19 + TypeScript**, `@supabase/supabase-js` 2.57, `xlsx` 0.18, `lucide-react`. Pas de Tailwind, pas de lib de test, pas de composant partagé de design system — chaque page réécrit ses styles inline dans un objet `S`.
- **~1 650 lignes de code applicatif** au total. La quasi-totalité des pages sont `'use client'` et parlent directement à Supabase depuis le navigateur.
- **Aucun dossier `supabase/`** dans le repo : les migrations existent côté base (17, versionnées) mais **ne sont pas dans Git**. Le schéma n'est donc pas reproductible depuis le dépôt.
- Pas de `middleware.ts`, pas de route API (`app/api/*`), pas de logique serveur — sauf 2 routes : `app/elite.webmanifest/route.ts` (manifest dynamique) et rien d'autre.
- `next.config.ts` minimal (`reactStrictMode` uniquement) : pas d'en-têtes de sécurité (CSP, HSTS, X-Frame-Options…).

### 2.2 Déploiement / configuration

- **`lib/supabase.ts` code en dur l'URL Supabase et la clé publishable.** Aucune variable d'environnement (`.env`, `process.env.NEXT_PUBLIC_*`) n'est utilisée dans tout le projet.
  - La clé `sb_publishable_...` est conçue pour être publique (équivalent anon key), donc ce n'est pas une fuite de secret au sens strict — **mais** cela viole l'exigence §9 du brief (« secrets exclusivement dans les variables d'environnement ») et **rend impossible tout environnement de staging** sans modifier le code. → **CA-15 non satisfait.**
- Service worker (`public/sw.js`) : cache réseau-first pour la navigation, cache `/_next/static/`, `/offline.html`. **Désenregistré totalement sur iOS** par `PWARegister.tsx` (`getRegistrations().then(unregister)`) → aucune capacité hors-ligne sur iPhone, qui est pourtant la cible n°1.
- 3 manifests : `public/hdy.webmanifest`, `public/diambars.webmanifest` (statiques), `app/elite.webmanifest/route.ts` (dynamique) — incohérence de traitement.

### 2.3 Base de données — schéma réel

**29 tables `public`** + 5 fonctions `private`. RLS activé sur 100 % des tables.

Domaines couverts (proche du modèle cible du brief §8) :
`organizations, teams, memberships, profiles, players` (+ `player_guardians, player_education, player_club_history, player_social_profiles, player_training_age, player_entry_baseline, player_documents`), `questionnaire_templates, questionnaire_responses, sessions, session_rpe, pain_declarations, gps_records, test_definitions, test_results, alerts, decisions, consents, audit_log, hrv_records, player_development_goals, development_actions, player_invites, staff_invites, app_status`.

**Tables du brief absentes :**

| Attendu (brief) | État |
|---|---|
| `medical_histories` | **Absente** |
| `medical_events` (blessures, RTP/RTT/RTP/RTPerf) | **Absente** |
| `seasons` | **Absente** (saison = colonne texte libre sur `teams`/`players`) |
| `questionnaire_assignments` (cible, horaires, rappels) | **Absente** (`questionnaire_templates.schedule` jsonb non exploité) |

→ **Tout le pilier « Dossier médical protégé » (brief §4) n'existe pas.** C'est le manque structurel le plus important.

Autres écarts de modèle :
- `players` très riche (~55 colonnes après `player_master_record_v2`), conforme au dossier maître.
- `gps_records.metrics` = jsonb libre (pas de colonnes typées) → conversions d'unités et validations non contraintes par le schéma (cf. LOT 6 : km ≠ m, déjà géré au cas par cas dans le front via `km()`).
- Pas de table de file d'attente offline / d'idempotence (`client_generated_id`, statut de sync) → **offline réel (brief §7) non amorcé.**

### 2.4 Sécurité

**Ce qui est correct :**
- RLS partout, modèle `deny-by-default` respecté (aucune policy = aucun accès).
- Helpers `private.is_super_admin() / is_org_member() / is_org_staff() / can_access_player()` bien construits (`SECURITY DEFINER`, `search_path` fixé, `STABLE`).
- Fonctions d'invitation (`create/validate/claim _player_invite` / `_staff_invite`) : token 32 octets, stocké **haché SHA-256**, expiration, contrôle d'email au claim, garde interne `auth.uid()` + rôle admin pour la création. `player_invites` / `staff_invites` non lisibles directement (0 policy = accès service-role/RPC uniquement).
- Auth Hook `hook_require_pending_invite` (before-user-created) : bloque toute inscription sans invitation valide en attente → **création libre de compte fermée**, conforme au brief §2.
- Les 2 bugs critiques de la session précédente sont **corrigés et présents en base** comme migrations versionnées (`fix_is_org_member_wrong_schema_reference`, `fix_hrv_records_insert_tautology_check`).

**Failles / écarts de sécurité identifiés :**

| # | Gravité | Constat |
|---|---|---|
| S1 | **Élevée** | **Confidentialité médicale non implémentée.** `player_documents_read` = `is_org_staff(org) OR (access_scope='player' AND can_access_player)`. Un document `access_scope='medical'` est donc lisible par **tout** membre staff (y compris `coach`). Le brief §4 / CA-06 exige que seul le médical y accède. Le champ `memberships.medical_clearance` existe mais **n'est utilisé nulle part** (ni RLS, ni front). |
| S2 | Moyenne | **Pas de cloisonnement par équipe.** `is_org_staff(org)` donne accès à *tous* les joueurs de l'organisation. Un coach U15 voit Pro A. Le brief demande un périmètre par équipe. |
| S3 | Moyenne | **Rôle `viewer` = accès écriture.** `is_org_staff` = « tout rôle ≠ player ». `players_staff_write` (`FOR ALL`) autorise donc un `viewer` à modifier/supprimer des joueurs. |
| S4 | Faible | 6 fonctions `SECURITY DEFINER` exécutables par `anon`/`authenticated` (advisor 0028/0029). Non exploitables (gardes internes) mais `EXECUTE` à révoquer pour `anon`. |
| S5 | Faible | Policies ciblent le rôle `public` au lieu de `authenticated` (inoffensif car `auth.uid()` NULL en anon, mais à resserrer). |
| S6 | Config | **Protection « mots de passe compromis » (HaveIBeenPwned) désactivée** dans Supabase Auth. À activer. |
| S7 | Config | `private.is_super_admin` est accordé en dur à `hdy.training.coach@gmail.com` dans `handle_new_user()` → non pilotable par la donnée. Acceptable en pilote, à sortir pour le multi-tenant. |
| S8 | Faible | Pas d'en-têtes de sécurité HTTP (CSP/HSTS/frame-options) au niveau Next/Vercel. |
| S9 | Info | `audit_log` existe mais **n'est écrit nulle part** (0 ligne, aucun trigger, aucun appel). Exigence §9 (journal d'audit) non satisfaite. |

### 2.5 Écrans existants (20 pages)

| Route | Rôle | État réel |
|---|---|---|
| `/` | Joueur + login + routeur | Login Supabase OK. Si compte ni joueur ni staff → **joueur DÉMO fictif « Mouhamed Ghazi »** affiché (soumissions désactivées). Parcours joueur : Hooper / RPE / Douleur. |
| `/join/player`, `/join/staff` | Activation invités | Fonctionnels (valident + claim via RPC + `signUp`). Dépendent d'une confirmation email manuelle. |
| `/admin/setup` | Bootstrap super-admin | `signUp` en dur pour `hdy.training.coach@gmail.com`. |
| `/admin`, `/admin/administration`, `/admin/sport`, `/admin/workspace` | Portails | Pages de navigation (cartes de liens). Titres, branding dynamique. |
| `/admin/registration` | Création joueur | Formulaire 5 étapes + **import CSV/Excel**. Gate : **super-admin uniquement**. Email obligatoire (y compris à l'import). |
| `/admin/roster` | Effectif Diambars | Liste + **bouton d'invitation joueur** (RPC + lien à copier). `organization_id` Diambars en dur. |
| `/admin/manage`, `/admin/manage/advanced` | Centre de gestion / saisie étendue | `manage` : onglets Joueurs/Compare/Tests/Staff, plusieurs **stubs** (« Interface modernisée prête pour… »). `advanced` : saisie séances / famille / scolarité / historique clubs. |
| `/admin/organizations` | Organisations & équipes | *(page non lue en détail — présumée liste)* |
| `/admin/administration/staff` | Staff & accès | Édition rôles/permissions/`medical_clearance`/`active` en direct. Invitation `prepa_physique` (RPC). Gate super-admin. |
| `/admin/sport/monitoring` | Monitoring quotidien | Tableau Hooper/RPE/sRPE/douleur/GPS/ACWR (+ HRV si Elite). Lit les données réelles. |
| `/admin/sport/gps` | Import GPS | CSV + Excel, mapping colonnes, dédup par date, **calcul ACWR (7j/28j) + création d'alerte automatique**. Diambars/Pro A en dur. |
| `/admin/sport/tests` | Tests | Saisie essais → best/mean, catalogue `test_definitions`. Gate super-admin. |
| `/admin/sport/sessions` | Séances | Création séance (type/date/durée/RPE prévu). Gate super-admin. |
| `/admin/sport/alerts` | Alertes | Liste, acquitter / clôturer. Pas d'écriture dans `decisions`. |
| `/admin/sport/comparator` | Comparatif | Tableau 2–4 joueurs sur `test_results`. Pas de radar. Champs lus (`test_name`, `name`, `value`) **incohérents avec le schéma réel** (`test_definition_id`, `best_value`). |
| `/admin/sport/hrv` | HRV (Elite) | Import CSV HRV + corrélations Pearson descriptives HRV↔Hooper / HRV↔sRPE. Correct. |
| `/admin/sport/players/[id]` | Dossier longitudinal | KPI historiques (P90), lecture du jour, ratios vs profil, tableau GPS. Pas de médical, pas de tests, pas de timeline. |
| `/hdy`, `/diambars`, `/elite` | Landing PWA installables | Manipulent `<head>` à la volée (manifest, icônes, meta). Splash désactivés (« asset source corrompu »). |

### 2.6 Données réellement présentes

- **2 organisations : `Diambars FC` (academy) + `HDY ELITE` (elite_performance)** — organisations **sœurs**, pas une org pilote « HDY Performance Engine » contenant les deux (divergence avec brief §1).
- 4 équipes, toutes Diambars (U15, U17, U19/Pro B, Pro A). HDY Elite : **0 équipe**.
- **82 joueurs réels** (roster sénégalais authentique) — import CSV. **0 lié à un compte**, quasi aucun email renseigné.
- **79 `gps_records`** — historique Excel réel (Pro A).
- 21 `test_definitions` (bon catalogue), 2 `questionnaire_templates` (Hooper v2 5 questions, RPE Foster v2).
- **0** `questionnaire_responses`, `sessions`, `session_rpe`, `pain_declarations`, `test_results`, `alerts`, `decisions`, `consents`, `hrv_records`, `medical_*`, `audit_log`.
- 1 seul compte utilisateur : Frédéric Hardy (super-admin, `organization_admin` sur les 2 orgs).
- 6 invitations staff + 1 invitation joueur en attente (personnes réelles).

→ **La boucle de monitoring n'a jamais tourné avec des données réelles.** Les dashboards sont branchés sur des tables vides.

---

## 3. Fonctionne / Simulé / Visuel seul / Manquant

| Domaine | Verdict |
|---|---|
| Auth email + invitations sécurisées + hook anti-inscription libre | **Fonctionne** |
| Isolation RLS par organisation | **Fonctionne** (hors médical & équipe) |
| Création joueur (staff) + dossier longitudinal administratif | **Fonctionne** (mais réservé super-admin, email obligatoire) |
| Import CSV joueurs / GPS | **Fonctionne** |
| Calcul ACWR + alerte automatique | **Fonctionne** (jamais exercé sur séance réelle) |
| Parcours joueur Hooper / RPE / Douleur | **Fonctionne** techniquement, **jamais alimenté** (0 réponse) |
| Questionnaires « configurables et versionnés » | **Simulé** : questions Hooper/RPE **codées en dur dans le client** ; le template DB n'est lu que pour `id`/`version` (brief §5 : « ne pas figer les questions dans le code ») |
| Joueur DÉMO fictif | **Simulé** (brief : « jamais de données fictives ») |
| Dashboards collectifs / comparateur / dossier | **Visuel seul** (tables vides ; comparateur lit de mauvais champs) |
| `/admin/manage` onglets Tests/Staff | **Visuel seul** (stubs) |
| Dossier médical protégé + RTP | **Manquant** (tables + écrans + RLS) |
| Cloisonnement par équipe | **Manquant** |
| Offline réellement synchronisé (queue, idempotence, conflits) | **Manquant** |
| Journal d'audit | **Manquant** (table vide, pas de trigger) |
| Storage Supabase (buckets, URLs signées) | **Manquant** (aucun bucket ; `player_documents` = métadonnées orphelines) |
| Consentements mineurs tracés | **Manquant** (table `consents` vide, aucun écran) |
| Exports CSV (profil / Hooper-RPE / médical / tests / GPS séparés) | **Manquant** |
| Tests automatisés (calculs, RLS, imports) | **Manquant** (aucune dépendance de test) |
| Multi-tenant / white-label | **Manquant** : `organization_id` + `team_id` + thèmes **codés en dur** dans ~12 fichiers |
| Variables d'environnement / staging reproductible | **Manquant** |
| PWA hors-ligne iOS | **Manquant** (SW désenregistré sur iOS) |
| Rendu visuel / responsive vérifié sur device | **Jamais fait** |

---

## 4. Écarts avec le cahier des charges v2 (par section)

- **§1 Vision / multi-tenant** — 2 orgs sœurs au lieu d'une org pilote HDY contenant Diambars + Elite ; IDs en dur ; pas de vrai white-label. HDY Elite quasi vide.
- **§2 Auth & inscription** — OK sur le fond (staff crée, invitation, hook). Manque : consentement représentant légal **tracé** pour mineurs ; désactivation d'accès sans suppression d'historique (pas d'UI) ; journal des connexions.
- **§3 Fiche joueur** — Structure DB complète et bien découpée. Manque : brouillon/reprise explicite, permissions **par section**, upload de documents (pas de Storage), `player_entry_baseline` non exposée dans l'UI.
- **§4 Dossier médical** — **Absent intégralement.** Aucune table, aucun écran, matrice d'accès (Joueur/Coach/Prépa/Médical/Direction) non implémentée.
- **§5 Questionnaires** — Hooper/RPE figés dans le code. Pas de `questionnaire_assignments` (horaires, rappels, cible). Douleur : reliée à rien (pas de lien vers Hooper/RPE/événement médical). Seuil d'alerte douleur non configurable.
- **§6 Dashboard & données réelles** — Cartes partielles, référence individuelle glissante (21–28 j) et stats (moyenne/médiane/écart-type/variation %) **non calculées**. « Données manquantes affichées » : partiellement (`—`).
- **§7 GPS / tests / offline** — GPS : import + ACWR OK ; manque mapping interactif de colonnes (auto uniquement), rapport d'erreurs, historisation des seuils individualisés, m/min, % Vmax individuel. Tests : saisie OK, manque CV, campagnes début/milieu/fin de saison, comparaison protocole-cohérente. **Offline : rien.**
- **§8 Architecture** — Stack conforme. Manque : `seasons`, médical, audit actif, Storage, couche serveur (« élévations de droits par fonction serveur protégée » — OK via RPC ; mais tout le reste est client direct).
- **§9 Sécurité / RGPD** — cf. tableau S1–S9. Manque : URLs signées, chiffrement documents, politique de conservation, export/suppression/anonymisation, en-têtes HTTP.
- **§10 Design system** — Pas de composants partagés ; styles inline dupliqués ; 5 fichiers CSS globaux (`globals`, `brand-themes`, `brand-fixes`, `logo-system`, `player-da`). safe-area gérée côté joueur uniquement. Jamais testé sur device.
- **§11–§12 Lots & CA** — cf. §5 ci-dessous.

---

## 5. Critères d'acceptation (brief §12)

| CA | Sujet | État |
|---|---|---|
| CA-01 | Staff crée un joueur complet, persisté après reconnexion | **Partiel** — OK mais super-admin only + email obligatoire |
| CA-02 | Import CSV sans doublon silencieux | **OK** (dédup par email ; signale les doublons) |
| CA-03 | Invitation joueur + email vérifié + mot de passe récupérable | **Partiel** — flux OK, dépend de la confirmation email ; « mot de passe oublié » présent mais non testé |
| CA-04 | Un joueur ne lit/modifie que ses données | **OK** (RLS `players_access_read` / `can_access_player`) |
| CA-05 | Diambars vs HDY Elite cloisonnés visuellement ET techniquement | **Partiel** — technique OK (org), visuel partiel, mais IDs en dur |
| CA-06 | Médical voit le dossier protégé ; coach/joueur non | **ÉCHEC** — pas de dossier médical ; `player_documents` médicaux lisibles par tout staff |
| CA-07 | Hooper/RPE configurables, versionnés, en base | **ÉCHEC** — questions figées dans le code |
| CA-08 | sRPE exact, y compris plusieurs séances/jour | **OK sur le calcul** (`durée×RPE`, choix de séance si ambiguïté) — non exercé en réel |
| CA-09 | Douleur ↔ alerte reliées, sans exclusion automatique | **Partiel** — alertes ACWR OK ; douleur ne génère **aucune** alerte ; pas de lien douleur↔médical |
| CA-10 | Dashboard = données réelles + données manquantes signalées | **Partiel** — pas de mock, mais tables vides et stats non calculées |
| CA-11 | Test physique saisi / comparé / exporté avec protocole | **Partiel** — saisie OK, comparateur bogué, export absent |
| CA-12 | CSV GPS prévisualisé / mappé / validé / importé / exporté | **Partiel** — pas de mapping manuel, pas d'export |
| CA-13 | Réponse offline survit / se synchronise une fois / signale son état | **ÉCHEC** — pas de file offline |
| CA-14 | Tests automatiques sur calculs / RLS / imports | **ÉCHEC** — aucun test |
| CA-15 | Déploiement Vercel documenté et reproductible, sans secret dans le dépôt | **ÉCHEC** — URL/clé Supabase en dur, migrations hors Git |
| CA-16 | Parcours joueur & staff testés sur téléphone et ordinateur | **ÉCHEC** — jamais vérifié visuellement |

**Score : 3 OK / 8 partiels / 6 échecs sur 17.**

---

## 6. Risques

1. **Pas d'accès Git en écriture** → aucune livraison possible tant que le PAT n'est pas fourni. *(bloquant immédiat)*
2. **Pas de Node local** → boucle de validation lente (build Vercel uniquement) ; risque de régression non détectée avant push.
3. **Migrations hors Git** → l'état de la base n'est pas reproductible ; un `supabase db reset` ou un nouvel environnement perdrait tout. **Priorité : rapatrier les 17 migrations dans `supabase/migrations/`.**
4. **Confidentialité médicale (S1)** → risque RGPD réel dès qu'un document médical est chargé. À traiter **avant** d'ouvrir le Storage.
5. **Refonte multi-tenant tardive** → plus on ajoute d'écrans avec IDs en dur, plus la sortie du white-label coûte cher. À cadrer tôt même si l'implémentation vient après.
6. **Dashboards vides en pilote** → si le pilote terrain démarre sans séances/questionnaires créés, l'appli paraît « cassée ». Prévoir un parcours d'amorçage.
7. **iOS = cible n°1 mais 0 offline + splash désactivés + jamais testé sur device.**

---

## 7. Architecture cible (résumé — à valider)

- **Env & config** : `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` en variables Vercel ; `lib/supabase.ts` lit `process.env`. Clé service-role jamais côté client — uniquement dans des routes serveur / Edge Functions.
- **Migrations dans le repo** : `supabase/migrations/*` (rapatrier l'existant + CI `supabase db diff`).
- **Multi-tenant** : suppression des constantes `DIAMBARS`/`ELITE`/`TEAMS` ; résolution du contexte (org courante, équipes, thème, branding) via un `OrgContext` React alimenté par `memberships` + `organizations.branding` + `teams`. Thèmes pilotés par `organizations.branding` (déjà en base). Une nouvelle organisation = 1 ligne + 1 upload de logo, zéro code.
- **Modèle médical** : `medical_histories`, `medical_events` (RTR/RTT/RTP/RTPerf, jours d'indispo calculés), RLS dédiée basée sur `memberships.medical_clearance` ; `player_documents.access_scope='medical'` → lisible seulement si `medical_clearance`.
- **Cloisonnement équipe** : helper `private.can_access_team(team_id)` + `memberships.team_id` (NULL = toutes équipes de l'org) ; policies joueurs/monitoring/GPS/tests scopées équipe.
- **Questionnaires pilotés par la donnée** : le client **rend** `questionnaire_templates.questions` (type d'échelle, libellés, ordre) ; `questionnaire_assignments` pour cible/horaire/rappels/version.
- **Offline** : IndexedDB (file `pending_submissions` : `client_uuid`, payload, `created_at`, `status`) + rejeu au retour réseau + contrainte d'unicité `client_uuid` côté base (idempotence) ; écran « à synchroniser / synchronisé / erreur ».
- **Audit** : triggers `AFTER INSERT/UPDATE/DELETE` sur les tables sensibles → `audit_log` (acteur, action, avant/après).
- **Design system** : composants partagés (`<Screen>`, `<Card>`, `<KPI>`, `<DataTable>`, `<Badge>`, `<Button>`, `<Field>`, `<PlayerCard>`) + tokens CSS par thème ; safe-area sur tous les shells.
- **Storage** : buckets privés par organisation (`org-{id}/players/{playerId}/…`), types & tailles limités, accès via URLs signées générées par une route serveur qui rejoue `can_access_player` + scope médical.

---

## 8. Plan de migration par lots

> Chaque lot = démo + critères d'acceptation + compte rendu, sans perte de données, migrations réversibles.

| Lot | Contenu | Sortie |
|---|---|---|
| **0.1 — Socle livrable** *(1/2 j)* | PAT Git ; rapatrier les 17 migrations dans `supabase/migrations/` ; passer Supabase URL/clé en env Vercel ; en-têtes de sécurité Next ; activer HIBP ; révoquer `EXECUTE` anon sur les 6 RPC. | Repo qui build sur Vercel, base reproductible, `git push` fonctionnel. |
| **1 — Sécurité & isolation** *(2–3 j)* | RLS médical (S1) ; scoping équipe (S2) ; `viewer` en lecture seule (S3) ; triggers `audit_log` ; tests d'isolation automatisés (joueur A ≠ joueur B, coach U15 ≠ Pro A, coach ≠ médical). | Isolation démontrée par tests (CA-04, CA-06). |
| **2 — Multi-tenant / white-label** *(3–4 j)* | `OrgContext` ; suppression des IDs en dur ; thèmes via `organizations.branding` ; `seasons` ; création d'org/équipe sans code. | Une 3e org fictive créée en base s'affiche correctement, sans déploiement. |
| **3 — Questionnaires pilotés par la donnée** *(2–3 j)* | Rendu dynamique de `questionnaire_templates.questions` ; `questionnaire_assignments` ; retirer le joueur DÉMO ; douleur → alerte (seuil configurable) + lien Hooper/RPE. | CA-07, CA-09 ; Hooper modifiable sans redeploy. |
| **4 — Boucle monitoring réelle** *(3–4 j)* | Parcours d'amorçage (séances, assignations) ; dashboards branchés + stats glissantes 7/28/90 j (moyenne/médiane/σ/variation %) ; « données manquantes » explicites ; comparateur corrigé + radar. | CA-08, CA-10, CA-11 sur données réelles du pilote. |
| **5 — Dossier médical** *(4–5 j)* | `medical_histories`, `medical_events`, RTR/RTT/RTP/RTPerf, jours d'indispo/matchs manqués calculés ; écrans médical ; matrice d'accès. | CA-06 complet. |
| **6 — Storage & documents** *(2–3 j)* | Buckets privés par org, limites, URLs signées via route serveur, upload dans la fiche joueur, scope médical. | Upload + accès contrôlé + expiration des URLs. |
| **7 — GPS/tests avancés & exports** *(3 j)* | Mapping interactif de colonnes, rapport d'erreurs, m/min, %Vmax individuel, historisation seuils ; CV tests, campagnes ; exports CSV séparés (profil / Hooper-RPE / médical autorisé / tests / GPS brut). | CA-11, CA-12. |
| **8 — Offline réel** *(3–4 j)* | File IndexedDB + idempotence base + rejeu + écran d'état + SW iOS réactivé + scénarios réseau testés. | CA-13. |
| **9 — Design system & mobile** *(3–4 j)* | Composants partagés, tokens, safe-area partout, revue responsive réelle iPhone/desktop, splash, icônes. | CA-16 ; `/diambars` `/hdy` `/elite` validés sur device. |
| **10 — QA / RGPD / doc** *(2–3 j)* | Consentements mineurs, export/suppression/anonymisation, journal connexions, doc de déploiement, `README` migration. | CA-14, CA-15, CA-16 ; définition de « terminé » atteinte. |

Estimation indicative : **~7–9 semaines** de développement à temps plein, hors allers-retours produit.

Ordre recommandé strict : **0.1 → 1 → 2** en priorité (fondations + sécurité + white-label), puis 3–4 (rendre le pilote utilisable), puis 5–10.

---

## 9. Questions bloquantes (celles qui changent l'architecture ou la protection des données)

1. **Structure tenant** : garde-t-on `Diambars FC` et `HDY ELITE` comme **deux organisations sœurs** (modèle actuel), ou bascule-t-on vers **une organisation pilote « HDY Performance Engine »** avec Diambars et Elite comme **équipes/environnements** (lecture littérale du brief §1) ? Cela conditionne tout le LOT 2.
2. **Médical — qui accède à quoi** : confirmer la matrice du brief §4 (Coach = statut + restrictions uniquement ; Prépa = « restreint » sur diagnostic ; Direction = « restreint »). Le champ pivot est-il `memberships.medical_clearance` (booléen) ou faut-il des niveaux ?
3. **Email joueur obligatoire ?** Le brief dit « dossier créé sans dépendre de l'email » ; l'app l'exige à l'import. Les 82 joueurs actuels n'ont pas d'email. On génère des invitations à la demande (staff saisit l'email au moment d'inviter) — OK ?
4. **Envoi réel des invitations** : aujourd'hui le staff copie un lien à la main. Veut-on un **envoi email automatique** (Edge Function + Resend/SMTP) ? Si oui, quel expéditeur / domaine ?
5. **Questionnaire Hooper définitif** : le brief mentionne un « document métier définitif » à fournir. Le template en base a 5 items (sommeil+durée, fatigue, stress, courbatures, humeur/motivation) ; le client en affiche 4. Lequel fait foi ?
6. **Hébergement des données** : Supabase est en `eu-central-1` (Francfort). Le brief évoque « hébergement européen si possible » et des joueurs au Sénégal. On confirme l'UE ?
7. **Environnement de staging** : crée-t-on un 2e projet Supabase + un environnement Vercel Preview dédiés, ou on reste mono-environnement pour le pilote ?
8. **Accès** : PAT GitHub (scope `repo`) + ID du projet Vercel + accès CLI Supabase (ou on continue via MCP).

---

*Fin de l'audit LOT 0. En attente de validation avant d'entamer le LOT 0.1.*
