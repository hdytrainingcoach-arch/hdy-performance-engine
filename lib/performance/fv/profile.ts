// Assemblage du profil Force-Vitesse réel (F0, V0, Sfv, Pmax) à partir des
// essais chargés, par régression F = a·V + b (voir regression.ts).
//
// Convention de signe (§ cahier des charges) : Sfv est la pente réelle de la
// régression et est négative dans sa représentation classique (F diminue
// quand V augmente). F0 = b (intercept à V=0). V0 = -F0/Sfv (intercept à F=0).
import { linearRegression, type Point } from './regression';
import { QUALITY_THRESHOLDS } from './constants';
import type { ProfileQuality, RegressionResult, TrialComputed } from './types';

export function computeRegressionFromTrials(trials: TrialComputed[]): RegressionResult {
  const usable = trials.filter(t => t.valid);
  const points: Point[] = usable.map(t => ({ x: t.velocityMs, y: t.forceN }));
  const reg = linearRegression(points);
  if (reg.slope >= 0) {
    throw new Error('Invalid force-velocity relationship: slope must be negative (force should decrease as velocity increases)');
  }
  return { f0: reg.intercept, sfv: reg.slope, v0: -reg.intercept / reg.slope, rSquared: reg.rSquared, standardError: reg.standardError, n: reg.n };
}

export function computePmax(f0: number, v0: number): number {
  return (f0 * v0) / 4;
}

export function classifyQuality(rSquared: number): ProfileQuality {
  if (rSquared >= QUALITY_THRESHOLDS.HIGH_R2) return 'HIGH';
  if (rSquared >= QUALITY_THRESHOLDS.MEDIUM_R2) return 'MEDIUM';
  return 'LOW';
}

export function bestLoadCondition(trials: TrialComputed[]): TrialComputed | null {
  const usable = trials.filter(t => t.valid);
  if (!usable.length) return null;
  return usable.reduce((best, t) => (t.powerW > best.powerW ? t : best), usable[0]);
}

export function loadRange(trials: TrialComputed[]): { minKg: number; maxKg: number } | null {
  const usable = trials.filter(t => t.valid);
  if (!usable.length) return null;
  const loads = usable.map(t => t.additionalLoadKg);
  return { minKg: Math.min(...loads), maxKg: Math.max(...loads) };
}
