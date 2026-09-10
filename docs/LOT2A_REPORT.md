# Compte rendu — LOT 2a : hiérarchie d'organisations

*Appliqué en production le 10 septembre 2026. Migrations `20260910101047`, `20260910101234`.*

## Ce qui a changé

- Nouvelle colonne `organizations.parent_organization_id`.
- Nouvelle organisation racine **« HDY Performance Engine »** (`type = platform`, id `1abb58d3-10dd-428f-943e-6397ac38b69e`).
- `Diambars FC` et `HDY Elite` ont maintenant cette racine pour parent.
- **Aucune donnée déplacée** : les 82 joueurs, 4 équipes, memberships, 79 GPS restent rattachés à Diambars / Elite.
- Nouvelle fonction `private.membership_scope()` (org de rattachement + descendants) ; `is_org_member` / `is_org_staff` / `is_org_editor` / `is_org_medical` / `can_access_team` remontent désormais la hiérarchie.
- `organizations_member_read` : un membre voit aussi son organisation parent (pour la navigation / le branding).

## Modèle d'accès

| Membership | Voit | Ne voit pas |
|---|---|---|
| Racine « HDY Performance Engine » | racine + Diambars + Elite (tout) | — |
| Diambars FC (org-admin) | Diambars + l'org racine (lecture) | HDY Elite |
| Diambars FC, coach équipe U17 | joueurs / données U17 uniquement | autres équipes Diambars, Elite |
| HDY Elite (coach) | HDY Elite | Diambars |
| super-admin | tout (inchangé) | — |

## Vérification (comptes temporaires, supprimés après)

| Scénario | Attendu | Obtenu |
|---|---|---|
| Coach U17 — joueurs visibles | 16 (U17) | **16** ✓ |
| Coach U17 — joueurs Pro A | 0 | **0** ✓ |
| Coach U17 — `is_org_staff(Diambars)` / `(Elite)` | true / false | **true / false** ✓ |
| Coach U17 — `can_access_team(U17)` / `(Pro A)` | true / false | **true / false** ✓ |
| Coach U17 — organisations lisibles | Diambars + racine (2) | **2**, dont « HDY Performance Engine » ✓ |
| Admin racine — joueurs visibles | 82 (tous) | **82** ✓ |
| Admin racine — `is_org_staff` Diambars / Elite | true / true | **true / true** ✓ |
| Admin racine — organisations lisibles | 3 | **3** ✓ |
| Staff Elite — joueurs Diambars visibles | 0 | **0** ✓ |
| Staff Elite — `is_org_member(Diambars)` | false | **false** ✓ |

Advisors sécurité : inchangés (2 INFO + WARN HIBP connus). Un correctif de récursion de policy a été nécessaire (`20260910101234`) — la policy `organizations` se référençait elle-même en ligne.

Également corrigé côté LOT 1.5 (advisors) : `revoke anon` sur `set_my_availability` / `confirm_availability`, `search_path` figé sur `touch_updated_at` (`20260910101624`).

## Reste : LOT 2b (frontend)

La base est prête pour le white-label mais **le frontend code encore en dur** les identifiants Diambars / Elite / équipes dans ~12 fichiers. LOT 2b : `OrgContext` React qui charge l'arbre d'organisations + équipes + branding depuis Supabase, suppression des constantes, création d'un nouvel environnement client sans toucher au code.
