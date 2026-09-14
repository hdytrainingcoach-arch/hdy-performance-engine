// Profil Force-Vitesse OPTIMAL individualisé (Sfv_opt, F0_opt, V0_opt).
//
// Référence : Samozino P, Rejc E, Di Prampero PE, Belli A, Morin JB (2012).
// "Optimal Force-Velocity Profile in Ballistic Movements — Altius: Citius
// or Fortius?" Med Sci Sports Exerc 44(2):313-22. DOI: 10.1249/MSS.0b013e31822d757a.
// Formule reprise de l'annexe supplémentaire (Supplemental Digital Content 1,
// appendice (b), équations [A12]-[A13]) — transcrite depuis le PDF fourni par
// l'utilisateur (article + annexe), et VÉRIFIÉE numériquement contre l'exemple
// chiffré donné par les auteurs eux-mêmes (Fig. 4 : pour Pmax=25 W/kg,
// hPO=0.4 m, push-off vertical (α=90°), Sfv_opt=-14.0 N·s·kg⁻¹·m⁻¹).
// Notre implémentation donne -14.023, soit un écart de 0.02 imputable à
// l'arrondi à une décimale des auteurs — voir optimalProfile.test.ts.
//
// Portée : α (angle de poussée par rapport à l'horizontale) = 90° pour un
// saut vertical, donc sin(α) = 1 et g·sin(α) = g. Les équations [A2] et
// [A5]-[A9] de l'annexe utilisent explicitement g·sin(α) ; l'annexe (b)
// (équations [A10]-[A13], qui donnent Sfv_opt) n'utilise plus que g seul —
// cohérent avec α=90° (push-off vertical, le cas de ce module HDY LAB).
// Généraliser à un profil sprint/incliné (α≠90°) demandera de revérifier si
// g doit être remplacé par g·sin(α) dans [A12]-[A13] — ne pas le supposer
// sans revalidation, d'où le champ pushOffAngleDeg figé à 90 ici.
import { MODEL_VERSION } from './constants';
import type { OptimalProfileResult } from './types';

const VERTICAL_PUSH_OFF_ANGLE_DEG = 90;

export type OptimalProfileInput = {
  bodyMassKg: number;
  pushOffDistanceM: number;
  pmax: number; // W/kg (relatif à la masse corporelle) — Pmax de l'équation [1]/[A4]
  gravity: number;
};

// Z(Pmax, hPO) — équation [A13].
function computeZ(pmax: number, d: number, g: number): number {
  const inner = 2 * g ** 3 * d ** 9 * pmax ** 6 + 27 * d ** 8 * pmax ** 8;
  const radicand = -(g ** 6) * d ** 6 - 18 * g ** 3 * d ** 5 * pmax ** 2 - 54 * d ** 4 * pmax ** 4 + 6 * Math.sqrt(3) * Math.sqrt(inner);
  return Math.cbrt(radicand);
}

// Sfv_opt — équation [A12].
function computeSfvOpt(pmax: number, d: number, g: number): number {
  const z = computeZ(pmax, d, g);
  const term1 = -(g ** 2) / (3 * pmax);
  const term2 = (g ** 4 * d ** 4 + 12 * g * d ** 3 * pmax ** 2) / (3 * d ** 2 * pmax * z);
  const term3 = z / (3 * d ** 2 * pmax);
  return term1 + term2 + term3;
}

export function calculate_optimal_fv_profile({ pushOffDistanceM, pmax, gravity }: OptimalProfileInput): OptimalProfileResult {
  if (!(pushOffDistanceM > 0) || !(pmax > 0) || !(gravity > 0)) {
    return { status: 'pending_model_validation', modelVersion: null, reason: 'pushOffDistanceM, pmax et gravity doivent être > 0 pour calculer le profil optimal.' };
  }

  const sfvOpt = computeSfvOpt(pmax, pushOffDistanceM, gravity);
  if (!Number.isFinite(sfvOpt) || sfvOpt >= 0) {
    return { status: 'pending_model_validation', modelVersion: null, reason: 'Solution Sfv_opt non réelle ou non négative pour ces paramètres (hors domaine de validité du modèle, voir annexe A1-A9 de Samozino et al. 2012).' };
  }

  // V0_opt, F0_opt à partir de Pmax = F0·V0/4 et Sfv = -F0/V0 (équations [1] et [3]).
  const v0Opt = Math.sqrt((-4 * pmax) / sfvOpt);
  const f0Opt = -sfvOpt * v0Opt;
  // Pmax_opt reste égal à pmax par construction (Sfv_opt maximise vTOmax à Pmax fixé) — vérifié dans fv.test.ts.

  return { status: 'computed', modelVersion: MODEL_VERSION, f0Opt, v0Opt, sfvOpt };
}

export const PUSH_OFF_ANGLE_ASSUMPTION_DEG = VERTICAL_PUSH_OFF_ANGLE_DEG;
