# Compte rendu — LOT 1 : sécurité & isolation

*Appliqué en production le 10 septembre 2026. Migrations `supabase/migrations/20260910062935*` → `20260910063852*`.*

## Migrations appliquées

| Version | Objet | Corrige |
|---|---|---|
| `…062935_lot1_a_helpers` | `private.is_org_editor` / `is_org_medical` / `can_access_team` ; `can_access_player` intègre le périmètre équipe | socle |
| `…063039_lot1_b_medical_confidentiality` | `player_documents` `access_scope='medical'` → personnel médical uniquement | **S1 / CA-06** |
| `…063109_lot1_c_team_scoping` | `players` + `sessions` scopés par équipe | **S2** |
| `…063128_lot1_d_viewer_read_only` | 20 policies d'écriture : `is_org_staff` → `is_org_editor` | **S3** |
| `…063212_lot1_e_audit_log_triggers` | trigger `private.write_audit()` sur `players`, `memberships`, `player_documents`, `consents`, `alerts`, `decisions`, `questionnaire_templates` | **S9** |
| `…063226_lot1_f_revoke_anon_rpc` | `revoke … from anon` sur `create_*` / `claim_*` | **S4** (partiel) |
| `…063426_lot1_g_revoke_public_rpc_fix` | correctif F : `revoke … from public` (anon héritait de PUBLIC) | **S4** |
| `…063852_lot1_h_fix_write_policy_select_scope` | correctif C/D : les `*_staff_write` (`FOR ALL`) élargissaient le SELECT et annulaient le cloisonnement équipe — leur `USING` reprend désormais la condition de lecture | **S2** (réel) |

## Vérification d'isolation (comptes temporaires, supprimés après test)

Données de test : 1 coach rattaché à l'équipe U17, 1 joueur U17 lié à un compte, 1 `viewer`, 1 `staff_medical`, 1 document `medical` + 1 enregistrement GPS sur un joueur Pro A. Tout dans une transaction annulée en fin de test (0 résidu vérifié).

| Scénario | Attendu | Obtenu |
|---|---|---|
| Coach U17 — joueurs visibles | U17 seulement (16) | **16** ✓ |
| Coach U17 — joueurs Pro A visibles | 0 | **0** ✓ |
| Coach U17 — GPS Pro A visibles | 0 | **0** ✓ |
| Coach U17 — documents `medical` visibles | 0 | **0** ✓ |
| Joueur U17 — joueurs visibles | 1 (lui-même) | **1** ✓ |
| Joueur U17 — documents visibles | 0 | **0** ✓ |
| `viewer` — lecture joueurs | OK (membre de l'org) | **82** ✓ |
| `viewer` — écriture joueur | refus RLS | **« new row violates row-level security policy »** ✓ |
| `staff_medical` — document `medical` visible | 1 | **1** ✓ |
| Trigger d'audit sur UPDATE `players` | 1 ligne (before + after) | **1** ✓ |
| `anon` → `claim_player_invite` / `create_staff_invite` | refus | **refus** ✓ |
| `anon` → `validate_player_invite` | autorisé (avant compte) | **autorisé** ✓ |

## Advisors sécurité — avant / après

| Advisor | Avant | Après |
|---|---|---|
| `anon_security_definer_function_executable` | 6 | **2** (uniquement `validate_*`, intentionnel) |
| `rls_enabled_no_policy` (`player_invites`, `staff_invites`) | 2 | 2 — *intentionnel* (accès RPC service-role uniquement) |
| `authenticated_security_definer_function_executable` | 6 | 6 — *intentionnel* (le staff crée les invitations, l'utilisateur les réclame ; gardes internes présentes) |
| `auth_leaked_password_protection` | WARN | WARN — **à activer dans le dashboard (S6)** |

## Reste à faire

- **S6** — Dashboard Supabase → Authentication → Providers → activer « Prevent use of leaked passwords ». *(seul réglage non scriptable)*
- **S8** — En-têtes HTTP : CSP avec nonce. Reportée (styles inline massifs) → LOT 9 (design system).
- Écriture scopée par équipe *sur ce qu'on peut créer* (pas seulement lire) : affinage possible, non bloquant.
- Suite de tests automatisée (pgTAP) pour rejouer ces scénarios en CI → LOT 10 (ou plus tôt sur demande).

## Impact sur l'app existante

Aucun pour l'utilisateur actuel (Frédéric Hardy, super-admin — accès total conservé). Les nouvelles règles s'appliquent aux futurs comptes staff/joueur au fur et à mesure de leur activation.
