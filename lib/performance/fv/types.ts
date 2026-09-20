// HDY LAB — Profil Force-Vitesse (module vertical).
// Types partagés du moteur. Voir index.ts pour l'orchestration et
// optimalProfile.ts pour le statut de validation du modèle.

export type MeasurementMethod = 'flight_time' | 'direct_measurement' | 'other';

export type RawTrialInput = {
  additionalLoadKg: number;
  jumpHeightM: number;
  measurementMethod?: MeasurementMethod;
  valid?: boolean; // false = essai marqué aberrant/exclu par le préparateur, conservé mais non utilisé dans la régression
};

export type FvTestInput = {
  athleteId: string;
  testDate: string;
  bodyMassKg: number;
  pushOffDistanceM: number;
  gravity?: number; // défaut 9.81, override possible (altitude, unités locales)
  protocol?: string;
  trials: RawTrialInput[];
};

export type TrialComputed = {
  trialNumber: number;
  additionalLoadKg: number;
  totalMassKg: number;
  jumpHeightM: number;
  measurementMethod: MeasurementMethod;
  velocityMs: number;
  forceN: number;
  forceRelativeNkg: number;
  powerW: number;
  valid: boolean;
};

export type RegressionResult = {
  f0: number; // N — intercept (b)
  sfv: number; // pente réelle, négative par convention (a dans F = a·V + b)
  v0: number; // m/s — intercept vitesse (-F0/Sfv)
  rSquared: number;
  standardError: number;
  n: number;
};

export type ProfileQuality = 'HIGH' | 'MEDIUM' | 'LOW';

export type OptimalProfileResult =
  | {
      status: 'computed';
      modelVersion: string;
      f0Opt: number;
      v0Opt: number;
      sfvOpt: number;
    }
  | {
      status: 'pending_model_validation';
      modelVersion: null;
      reason: string;
    };

export type DeficitType = 'force' | 'balanced' | 'velocity' | 'unavailable';

export type ImbalanceResult =
  | {
      status: 'computed';
      fvImbalancePercent: number;
      profileOptimalPercent: number;
      deficitType: DeficitType;
    }
  | {
      status: 'unavailable';
      reason: string;
    };

export type ValidationIssue = { code: string; message: string; trialNumber?: number };

export type FvTestResult = {
  status: 'valid' | 'invalid';
  issues: ValidationIssue[];
  trials: TrialComputed[];
  regression: RegressionResult | null;
  pmax: number | null;
  pmaxRelative: number | null;
  quality: ProfileQuality | null;
  optimalProfile: OptimalProfileResult | null;
  imbalance: ImbalanceResult | null;
  modelVersion: string;
  gravity: number;
  pushOffDistanceM: number;
  bodyMassKg: number;
};
