import { describe, it, expect } from 'vitest';
import { computeFvTest } from './index';
import { takeoffVelocityFromHeight } from './velocity';
import { calculate_mean_force } from './force';
import { linearRegression } from './regression';
import { classifyQuality } from './profile';
import { calculate_optimal_fv_profile } from './optimalProfile';
import { computeImbalance } from './imbalance';
import { validateFvTestInput } from './validation';
import type { FvTestInput } from './types';

const G = 9.81;

describe('velocity', () => {
  it('computes takeoff velocity from jump height (v = sqrt(2gh))', () => {
    expect(takeoffVelocityFromHeight(0.32, G)).toBeCloseTo(2.505673562138532, 9);
  });
  it('rejects a non-positive jump height', () => {
    expect(() => takeoffVelocityFromHeight(0, G)).toThrow();
    expect(() => takeoffVelocityFromHeight(-0.1, G)).toThrow();
  });
});

describe('calculate_mean_force', () => {
  it('applies the Samozino no-force-plate formula F = m·g·(1+h/d)', () => {
    const { meanForceN, meanForceRelativeNkg } = calculate_mean_force({ totalMassKg: 70, jumpHeightM: 0.32, pushOffDistanceM: 0.4, gravity: G });
    expect(meanForceN).toBeCloseTo(1236.06, 6);
    expect(meanForceRelativeNkg).toBeCloseTo(1236.06 / 70, 9);
  });
  it('rejects non-positive mass, height, distance or gravity', () => {
    expect(() => calculate_mean_force({ totalMassKg: 0, jumpHeightM: 0.3, pushOffDistanceM: 0.4, gravity: G })).toThrow();
    expect(() => calculate_mean_force({ totalMassKg: 70, jumpHeightM: 0, pushOffDistanceM: 0.4, gravity: G })).toThrow();
    expect(() => calculate_mean_force({ totalMassKg: 70, jumpHeightM: 0.3, pushOffDistanceM: 0, gravity: G })).toThrow();
    expect(() => calculate_mean_force({ totalMassKg: 70, jumpHeightM: 0.3, pushOffDistanceM: 0.4, gravity: 0 })).toThrow();
  });
});

describe('linearRegression', () => {
  it('fits an exact line through 2 points (R² = 1)', () => {
    const reg = linearRegression([{ x: 2.4261079942986874, y: 1201.7250000000001 }, { x: 1.9809088823063015, y: 1324.3500000000001 }]);
    expect(reg.slope).toBeCloseTo(-275.43855478781194, 3);
    expect(reg.intercept).toBeCloseTo(1869.9686797087877, 3);
    expect(reg.rSquared).toBeCloseTo(1, 9);
  });
  it('rejects fewer than 2 points', () => {
    expect(() => linearRegression([{ x: 1, y: 1 }])).toThrow();
  });
  it('rejects points with no variation in x', () => {
    expect(() => linearRegression([{ x: 1, y: 1 }, { x: 1, y: 2 }])).toThrow();
  });
});

describe('classifyQuality', () => {
  it('classifies HIGH/MEDIUM/LOW from configurable R² thresholds', () => {
    expect(classifyQuality(0.99)).toBe('HIGH');
    expect(classifyQuality(0.95)).toBe('HIGH');
    expect(classifyQuality(0.92)).toBe('MEDIUM');
    expect(classifyQuality(0.9)).toBe('MEDIUM');
    expect(classifyQuality(0.5)).toBe('LOW');
  });
});

describe('calculate_optimal_fv_profile', () => {
  // Vérification contre l'exemple chiffré donné par Samozino et al. (2012)
  // eux-mêmes (Fig. 4 : Pmax=25 W/kg, hPO=0.4 m, push-off vertical →
  // Sfv_opt=-14.0 N·s·kg⁻¹·m⁻¹). Notre implémentation de l'annexe [A12]-[A13]
  // donne -14.02, à l'arrondi près des auteurs.
  it('matches the worked example published in Samozino et al. (2012), Fig. 4', () => {
    const result = calculate_optimal_fv_profile({ bodyMassKg: 75, pushOffDistanceM: 0.4, pmax: 25, gravity: G });
    expect(result.status).toBe('computed');
    if (result.status === 'computed') {
      expect(result.sfvOpt).toBeCloseTo(-14.02, 1);
      expect(result.modelVersion).not.toBeNull();
    }
  });

  it('derives F0_opt and V0_opt consistent with Pmax = F0·V0/4 and Sfv = -F0/V0', () => {
    const result = calculate_optimal_fv_profile({ bodyMassKg: 75, pushOffDistanceM: 0.4, pmax: 25, gravity: G });
    expect(result.status).toBe('computed');
    if (result.status === 'computed') {
      expect((result.f0Opt * result.v0Opt) / 4).toBeCloseTo(25, 6);
      expect(-result.f0Opt / result.v0Opt).toBeCloseTo(result.sfvOpt, 6);
    }
  });

  it('refuses to compute for non-positive inputs rather than guessing', () => {
    expect(calculate_optimal_fv_profile({ bodyMassKg: 75, pushOffDistanceM: 0, pmax: 25, gravity: G }).status).toBe('pending_model_validation');
    expect(calculate_optimal_fv_profile({ bodyMassKg: 75, pushOffDistanceM: 0.4, pmax: 0, gravity: G }).status).toBe('pending_model_validation');
  });
});

describe('computeImbalance', () => {
  it('is computed once a validated optimal profile is available', () => {
    const optimal = calculate_optimal_fv_profile({ bodyMassKg: 75, pushOffDistanceM: 0.4, pmax: 25, gravity: G });
    const result = computeImbalance(-14.02, optimal);
    expect(result.status).toBe('computed');
    if (result.status === 'computed') expect(result.profileOptimalPercent).toBeCloseTo(100, 0);
  });
  it('classifies force/balanced/velocity deficit once an optimal slope is available', () => {
    // On simule un profil optimal déjà validé pour tester uniquement la classification (§10-11 du cahier des charges).
    const optimal = { status: 'computed' as const, modelVersion: 'test', f0Opt: 0, v0Opt: 0, sfvOpt: -400 };
    expect(computeImbalance(-288, optimal)).toMatchObject({ status: 'computed', profileOptimalPercent: 72, deficitType: 'force' });
    expect(computeImbalance(-380, optimal)).toMatchObject({ status: 'computed', profileOptimalPercent: 95, deficitType: 'balanced' });
    expect(computeImbalance(-400, optimal)).toMatchObject({ status: 'computed', profileOptimalPercent: 100, deficitType: 'balanced' });
    expect(computeImbalance(-428, optimal)).toMatchObject({ status: 'computed', profileOptimalPercent: 107, deficitType: 'balanced' });
    expect(computeImbalance(-512, optimal)).toMatchObject({ status: 'computed', profileOptimalPercent: 128, deficitType: 'velocity' });
  });
});

describe('validateFvTestInput', () => {
  const base: FvTestInput = {
    athleteId: 'p1',
    testDate: '2026-09-13',
    bodyMassKg: 70,
    pushOffDistanceM: 0.4,
    trials: [
      { additionalLoadKg: 0, jumpHeightM: 0.32 },
      { additionalLoadKg: 20, jumpHeightM: 0.24 },
    ],
  };
  it('accepts valid input with no blocking issues', () => {
    expect(validateFvTestInput(base)).toEqual([]);
  });
  it('flags body mass ≤ 0', () => {
    expect(validateFvTestInput({ ...base, bodyMassKg: 0 }).some(i => i.code === 'invalid_body_mass')).toBe(true);
  });
  it('flags push-off distance ≤ 0', () => {
    expect(validateFvTestInput({ ...base, pushOffDistanceM: -1 }).some(i => i.code === 'invalid_push_off_distance')).toBe(true);
  });
  it('flags jump height = 0', () => {
    expect(validateFvTestInput({ ...base, trials: [{ additionalLoadKg: 0, jumpHeightM: 0 }, base.trials[1]] }).some(i => i.code === 'invalid_jump_height')).toBe(true);
  });
  it('flags a negative load', () => {
    expect(validateFvTestInput({ ...base, trials: [{ additionalLoadKg: -5, jumpHeightM: 0.3 }, base.trials[1]] }).some(i => i.code === 'negative_load')).toBe(true);
  });
  it('flags insufficient trial count', () => {
    expect(validateFvTestInput({ ...base, trials: [base.trials[0]] }).some(i => i.code === 'insufficient_trials')).toBe(true);
  });
  it('flags identical loads across all trials (no variation to regress on)', () => {
    expect(validateFvTestInput({ ...base, trials: [{ additionalLoadKg: 10, jumpHeightM: 0.3 }, { additionalLoadKg: 10, jumpHeightM: 0.28 }] }).some(i => i.code === 'no_load_variation')).toBe(true);
  });
  it('flags duplicate trials as non-blocking', () => {
    const issues = validateFvTestInput({ ...base, trials: [...base.trials, { additionalLoadKg: 0, jumpHeightM: 0.32 }] });
    expect(issues.some(i => i.code === 'duplicate_trial')).toBe(true);
  });
});

describe('computeFvTest (end-to-end)', () => {
  const input: FvTestInput = {
    athleteId: 'p1',
    testDate: '2026-09-13',
    bodyMassKg: 70,
    pushOffDistanceM: 0.4,
    trials: [
      { additionalLoadKg: 0, jumpHeightM: 0.32 },
      { additionalLoadKg: 10, jumpHeightM: 0.28 },
      { additionalLoadKg: 20, jumpHeightM: 0.24 },
      { additionalLoadKg: 30, jumpHeightM: 0.2 },
    ],
  };

  it('computes F0, Sfv, V0, Pmax matching the reference implementation', () => {
    const result = computeFvTest(input);
    expect(result.status).toBe('valid');
    expect(result.regression!.f0).toBeCloseTo(2368.56795076133, 3);
    expect(result.regression!.sfv).toBeCloseTo(-446.63689732332756, 3);
    expect(result.regression!.v0).toBeCloseTo(5.303117509896827, 3);
    expect(result.pmax).toBeCloseTo(3140.198543265714, 3);
    expect(result.pmaxRelative).toBeCloseTo(44.8599791895102, 3);
    expect(result.regression!.rSquared).toBeCloseTo(0.9787838994536388, 9);
    expect(result.quality).toBe('HIGH');
  });

  it('computes the optimal profile and FV imbalance, comparing like-for-like relative units', () => {
    const result = computeFvTest(input);
    expect(result.optimalProfile?.status).toBe('computed');
    expect(result.imbalance?.status).toBe('computed');
    if (result.optimalProfile?.status === 'computed' && result.imbalance?.status === 'computed') {
      expect(result.optimalProfile.sfvOpt).toBeLessThan(0);
      expect(['force', 'balanced', 'velocity']).toContain(result.imbalance.deficitType);
      // Sfv réel (régression sur force absolue) et Sfv_opt (relatif) ne sont
      // comparables qu'une fois ramenés à la même unité (§ index.ts) : on
      // vérifie ici que profileOptimalPercent a bien été calculé sur cette
      // base normalisée plutôt que sur les valeurs absolues mélangées.
      const sfvRelative = result.regression!.sfv / result.bodyMassKg;
      expect(result.imbalance.profileOptimalPercent).toBeCloseTo((sfvRelative / result.optimalProfile.sfvOpt) * 100, 6);
    }
  });

  it('preserves raw per-trial data for later recomputation', () => {
    const result = computeFvTest(input);
    expect(result.trials).toHaveLength(4);
    expect(result.trials[0]).toMatchObject({ additionalLoadKg: 0, totalMassKg: 70, jumpHeightM: 0.32 });
  });

  it('excludes trials explicitly marked invalid (aberrant) from the regression', () => {
    const withOutlier: FvTestInput = { ...input, trials: [...input.trials, { additionalLoadKg: 40, jumpHeightM: 0.6, valid: false }] };
    const result = computeFvTest(withOutlier);
    expect(result.status).toBe('valid');
    expect(result.trials).toHaveLength(5);
    expect(result.regression!.n).toBe(4); // l'essai aberrant est conservé (trials) mais exclu de la régression
  });

  it('rejects when body mass is 0', () => {
    const result = computeFvTest({ ...input, bodyMassKg: 0 });
    expect(result.status).toBe('invalid');
    expect(result.issues.some(i => i.code === 'invalid_body_mass')).toBe(true);
  });

  it('rejects when a jump height is 0', () => {
    const result = computeFvTest({ ...input, trials: [{ additionalLoadKg: 0, jumpHeightM: 0 }, input.trials[1]] });
    expect(result.status).toBe('invalid');
  });

  it('rejects a negative load', () => {
    const result = computeFvTest({ ...input, trials: [{ additionalLoadKg: -10, jumpHeightM: 0.3 }, input.trials[1]] });
    expect(result.status).toBe('invalid');
    expect(result.issues.some(i => i.code === 'negative_load')).toBe(true);
  });

  it('rejects an insufficient number of trials', () => {
    const result = computeFvTest({ ...input, trials: [input.trials[0]] });
    expect(result.status).toBe('invalid');
  });

  it('rejects an incoherent force-velocity relationship (force increasing with velocity)', () => {
    // Données inversées : plus la charge augmente, plus le saut est haut (physiologiquement incohérent).
    const incoherent: FvTestInput = {
      ...input,
      trials: [
        { additionalLoadKg: 0, jumpHeightM: 0.2 },
        { additionalLoadKg: 20, jumpHeightM: 0.32 },
      ],
    };
    const result = computeFvTest(incoherent);
    expect(result.status).toBe('invalid');
    expect(result.issues.some(i => i.code === 'incoherent_fv_relationship')).toBe(true);
  });

  it('is a pure function: the same input always yields the same output', () => {
    expect(computeFvTest(input)).toEqual(computeFvTest(input));
  });
});
