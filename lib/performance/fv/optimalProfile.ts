// Profil Force-Vitesse OPTIMAL individualisé (Sfv_opt, F0_opt, V0_opt).
//
// STATUT : NON IMPLÉMENTÉ INTENTIONNELLEMENT.
//
// Le cahier des charges HDY LAB (§9) est explicite : « Ne pas inventer une
// approximation du profil optimal. La formule exacte utilisée doit être
// documentée dans le code [...] Les développeurs doivent utiliser les
// publications originales pour vérifier les équations exactes avant
// validation du moteur. »
//
// Cette fonction existe pour que le pipeline (imbalance.ts, l'API, l'UI)
// soit déjà câblé — mais elle renvoie explicitement un statut
// 'pending_model_validation' plutôt qu'un chiffre, tant que la formule
// exacte de Samozino et al. (2012, "Optimal Force-Velocity Profile in
// Ballistic Movements — Altius", Med Sci Sports Exerc) n'a pas été
// vérifiée mot pour mot sur la publication originale (ou un tableur de
// référence des auteurs).
//
// Pourquoi ce n'est pas fait ici : l'environnement d'exécution qui a écrit
// ce module n'a pas d'accès réseau sortant vers les éditeurs académiques
// (ScienceDirect, ResearchGate, PMC, PLOS, scienceforsport.com — tous
// bloqués par le proxy réseau de ce sandbox). La régression F0/V0/Sfv/Pmax
// ci-dessus est solide (dérivable indépendamment, voir force.ts) ; le
// profil optimal ne l'est pas et ne doit pas être deviné.
//
// Pour terminer cette fonction : reprendre l'équation exacte de la
// publication (probablement de la forme Sfv_opt = f(Pmax, bodyMassKg,
// pushOffDistanceM, gravity) obtenue par optimisation sous contrainte
// Pmax = F0·V0/4), l'implémenter ci-dessous, lui donner un model_version
// explicite (ex. 'Samozino_Morin_FV_v1.1'), et ajouter les tests
// correspondants dans optimalProfile.test.ts avant d'activer imbalance.ts.
import type { OptimalProfileResult } from './types';

export type OptimalProfileInput = {
  bodyMassKg: number;
  pushOffDistanceM: number;
  pmax: number;
  gravity: number;
};

export function calculate_optimal_fv_profile(_input: OptimalProfileInput): OptimalProfileResult {
  return {
    status: 'pending_model_validation',
    modelVersion: null,
    reason:
      "Formule Sfv_opt non vérifiée sur la publication originale (Samozino et al. 2012) dans cet environnement — voir commentaire en tête de fichier. F0/V0/Pmax restent disponibles et fiables.",
  };
}
