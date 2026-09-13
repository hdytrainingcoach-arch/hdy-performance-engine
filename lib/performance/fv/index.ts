// Point d'entrée du moteur Force-Vitesse — orchestration seulement, aucune
// formule n'est définie dans ce fichier (elles vivent dans velocity.ts,
// force.ts, regression.ts, profile.ts, optimalProfile.ts, imbalance.ts).
import { DEFAULT_GRAVITY, MODEL_VERSION } from './constants';
import { takeoffVelocityFromHeight, resolveMeasurementMethod } from './velocity';
import { calculate_mean_force, powerFromForceAndVelocity } from './force';
import { computeRegressionFromTrials, computePmax, classifyQuality } from './profile';
import { calculate_optimal_fv_profile } from './optimalProfile';
import { computeImbalance } from './imbalance';
import { validateFvTestInput, hasBlockingIssues } from './validation';
import type { FvTestInput, FvTestResult, TrialComputed, ValidationIssue } from './types';

export * from './types';
export { calculate_mean_force, powerFromForceAndVelocity } from './force';
export { calculate_optimal_fv_profile } from './optimalProfile';
export { computeImbalance } from './imbalance';
export { linearRegression } from './regression';
export { MODEL_VERSION, DEFAULT_GRAVITY, QUALITY_THRESHOLDS, IMBALANCE_ZONE } from './constants';

function invalidResult(issues: ValidationIssue[], gravity: number, pushOffDistanceM: number, bodyMassKg: number, trials: TrialComputed[] = []): FvTestResult {
  return {
    status: 'invalid',
    issues,
    trials,
    regression: null,
    pmax: null,
    pmaxRelative: null,
    quality: null,
    optimalProfile: null,
    imbalance: null,
    modelVersion: MODEL_VERSION,
    gravity,
    pushOffDistanceM,
    bodyMassKg,
  };
}

export function computeFvTest(input: FvTestInput): FvTestResult {
  const gravity = input.gravity ?? DEFAULT_GRAVITY;
  const issues = validateFvTestInput({ ...input, gravity });

  if (hasBlockingIssues(issues)) return invalidResult(issues, gravity, input.pushOffDistanceM, input.bodyMassKg);

  const trials: TrialComputed[] = input.trials.map((t, i) => {
    const totalMassKg = input.bodyMassKg + t.additionalLoadKg;
    const velocityMs = takeoffVelocityFromHeight(t.jumpHeightM, gravity);
    const { meanForceN, meanForceRelativeNkg } = calculate_mean_force({ totalMassKg, jumpHeightM: t.jumpHeightM, pushOffDistanceM: input.pushOffDistanceM, gravity });
    return {
      trialNumber: i + 1,
      additionalLoadKg: t.additionalLoadKg,
      totalMassKg,
      jumpHeightM: t.jumpHeightM,
      measurementMethod: resolveMeasurementMethod(t.measurementMethod),
      velocityMs,
      forceN: meanForceN,
      forceRelativeNkg: meanForceRelativeNkg,
      powerW: powerFromForceAndVelocity(meanForceN, velocityMs),
      valid: t.valid !== false,
    };
  });

  let regression;
  try {
    regression = computeRegressionFromTrials(trials);
  } catch (e) {
    return invalidResult([...issues, { code: 'incoherent_fv_relationship', message: (e as Error).message }], gravity, input.pushOffDistanceM, input.bodyMassKg, trials);
  }

  const pmax = computePmax(regression.f0, regression.v0);

  if (regression.f0 <= 0) issues.push({ code: 'negative_f0', message: 'F0 calculé ≤ 0 : données incohérentes.' });
  if (regression.v0 <= 0) issues.push({ code: 'negative_v0', message: 'V0 calculé ≤ 0 : données incohérentes.' });
  if (pmax <= 0) issues.push({ code: 'negative_pmax', message: 'Pmax calculé ≤ 0 : données incohérentes.' });
  if (hasBlockingIssues(issues)) return invalidResult(issues, gravity, input.pushOffDistanceM, input.bodyMassKg, trials);

  const optimalProfile = calculate_optimal_fv_profile({ bodyMassKg: input.bodyMassKg, pushOffDistanceM: input.pushOffDistanceM, pmax, gravity });
  const imbalance = computeImbalance(regression.sfv, optimalProfile);

  return {
    status: 'valid',
    issues,
    trials,
    regression,
    pmax,
    pmaxRelative: pmax / input.bodyMassKg,
    quality: classifyQuality(regression.rSquared),
    optimalProfile,
    imbalance,
    modelVersion: MODEL_VERSION,
    gravity,
    pushOffDistanceM: input.pushOffDistanceM,
    bodyMassKg: input.bodyMassKg,
  };
}
