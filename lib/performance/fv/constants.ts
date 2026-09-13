// Constantes du moteur Force-Vitesse. Les seuils de qualité et de zone
// "équilibrée" sont des réglages HDY, pas des valeurs scientifiques
// universelles — ils sont volontairement isolés ici pour rester
// configurables sans toucher au moteur de calcul.
export const DEFAULT_GRAVITY = 9.81;

export const MODEL_VERSION = 'Samozino_Morin_FV_v1';

export const QUALITY_THRESHOLDS = {
  HIGH_R2: 0.95,
  MEDIUM_R2: 0.9,
} as const;

export const IMBALANCE_ZONE = {
  balancedLower: 90,
  balancedUpper: 110,
} as const;

export const MIN_TRIALS_FOR_REGRESSION = 2;
export const RECOMMENDED_TRIALS = 4;
