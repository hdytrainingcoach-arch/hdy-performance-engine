// FV imbalance et classification du déficit — formule fournie par le
// cahier des charges HDY (§10-11), appliquée telle quelle. Ne dépend PAS
// d'une source externe : c'est une convention de lecture HDY sur un ratio
// de pentes, une fois que Sfv_opt est disponible (voir optimalProfile.ts,
// actuellement en attente de validation — imbalance.ts renvoie donc
// 'unavailable' tant que Sfv_opt n'est pas calculé).
import { IMBALANCE_ZONE } from './constants';
import type { DeficitType, ImbalanceResult, OptimalProfileResult } from './types';

export function computeImbalance(sfvReal: number, optimal: OptimalProfileResult): ImbalanceResult {
  if (optimal.status !== 'computed') {
    return { status: 'unavailable', reason: optimal.status === 'pending_model_validation' ? optimal.reason : 'optimal profile unavailable' };
  }
  const { sfvOpt } = optimal;
  if (sfvOpt === 0) return { status: 'unavailable', reason: 'sfvOpt is zero' };

  // Les deux pentes sont négatives par convention ; leur ratio est donc positif.
  const profileOptimalPercent = (sfvReal / sfvOpt) * 100;
  const fvImbalancePercent = Math.abs(100 - profileOptimalPercent);
  const deficitType: DeficitType =
    profileOptimalPercent < IMBALANCE_ZONE.balancedLower ? 'force' : profileOptimalPercent > IMBALANCE_ZONE.balancedUpper ? 'velocity' : 'balanced';

  return { status: 'computed', fvImbalancePercent, profileOptimalPercent, deficitType };
}
