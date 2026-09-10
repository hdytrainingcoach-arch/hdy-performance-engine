# Compte rendu — LOT 5 : dossier médical protégé

*10 septembre 2026. Migration `20260910163237` (appliquée + vérifiée), frontend (build local OK).*

## Base de données

| Table | Rôle | Accès |
|---|---|---|
| `medical_histories` (1/joueur) | antécédents : pathologies, chirurgies, hospitalisations, allergies, traitements, contre-indications, commotions, cardio-respiratoire, observations | **médical + super-admin** |
| `medical_events` (N/joueur) | blessure / événement : date, contexte, zone, latéralité, douleur, mécanisme, gravité, diagnostic, imagerie, compte rendu, traitement, restrictions, chirurgie, récidive, **RTR / RTT / RTP / RTPerf** (prévu + réel) | **médical + super-admin** |
| `player_medical_status` (1/joueur) | statut fonctionnel **partagé** : disponible / travail adapté / indisponible / en soins + restrictions explicitement partagées + retour prévu + événement actif | écrit par le **médical** · **lu par tout le staff / le joueur** (statut seulement) |

- **Jours d'indisponibilité calculés** : colonnes générées `days_out_training` (onset → RTT réel) et `days_out_play` (onset → RTP réel).
- Triggers d'audit sur les 3 tables.
- **`audit_log` resserré** : les lignes d'audit médical (`medical_histories` / `medical_events`, qui contiennent le contenu avant/après) ne sont lisibles que par le personnel médical — un coach ne peut pas les lire.

## Vérification (comptes temporaires, supprimés après)

| Scénario | Attendu | Obtenu |
|---|---|---|
| Médical — crée antécédents + événement + statut | OK | **OK** |
| Médical — `days_out_training` (onset J-20, RTT réel J-6) | 14 | **14** ✓ |
| Coach — lit `medical_histories` / `medical_events` | 0 | **0** ✓ |
| Coach — lit `player_medical_status` (restrictions partagées) | 1 | **1** ✓ |
| Coach — écrit `player_medical_status` | refusé | **0 ligne modifiée** (RLS) ✓ |
| Coach — écrit `medical_events` | refusé | **RLS violation** ✓ |
| Coach — lit l'audit médical | 0 | **0** ✓ |
| Médical — lit l'audit médical | > 0 | **oui** ✓ |

## Frontend

- **`/admin/medical`** — liste médicale (accès réservé : rôle `staff_medical` ou `medical_clearance` ou super-admin). Compteurs par disponibilité, tableau joueur → disponibilité, restrictions partagées, blessures en cours, retour prévu.
- **`/admin/medical/[id]`** — dossier médical complet :
  - *Statut fonctionnel partagé* (ce que le coach verra) ;
  - *Antécédents médicaux* (9 champs, upsert) ;
  - *Événements médicaux* : création / édition avec zone, mécanisme, gravité, diagnostic, imagerie, compte rendu, traitement, restrictions, chirurgie, récidive, et le **retour progressif RTR/RTT/RTP/RTPerf** (dates prévues + réelles), jours d'indispo affichés.
- **Dossier joueur `/admin/sport/players/[id]`** — bandeau **« STATUT MÉDICAL »** en lecture seule (composant `PlayerMedicalChip`) : disponibilité + restrictions partagées + retour prévu. **Jamais le diagnostic.**
- Lien ajouté dans `/admin/administration`.

## Critères d'acceptation

| CA | Avant | Après |
|---|---|---|
| CA-06 (médical voit le dossier protégé ; coach/joueur ne voient pas le diagnostic) | ÉCHEC | **OK** |

## Reste / suite possible

- Séances & matchs manqués (calcul par recoupement avec `sessions` dans la fenêtre de blessure) — à ajouter quand des séances réelles existent.
- Matrice fine « restreint » pour préparateur / direction (le brief distingue « restreint » de « non »). Actuellement : médical = tout, reste = statut partagé.
- Upload de comptes rendus médicaux → dépend du LOT 6 (Storage), scope `access_scope='medical'` déjà prêt côté RLS.
