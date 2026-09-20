// Calibration pixel → distance réelle et dérivation vitesse/splits à partir
// d'une série position-temps suivie automatiquement (voir pose-tracker.ts).
// Fonctions pures, testables indépendamment du suivi vidéo.

export type Calibration = { xA: number; xB: number; distanceM: number };
export type Sample = { t: number; xPixel: number };

export function pixelToDistanceM(xPixel: number, cal: Calibration): number {
  if (cal.xB === cal.xA) throw new Error('Les deux repères de calibration ne peuvent pas être au même endroit.');
  return (cal.distanceM * (xPixel - cal.xA)) / (cal.xB - cal.xA);
}

export function toDistanceSeries(samples: Sample[], cal: Calibration): { t: number; d: number }[] {
  return samples.map(s => ({ t: s.t, d: pixelToDistanceM(s.xPixel, cal) }));
}

// Moyenne mobile simple pour lisser le bruit de détection image par image.
export function smooth(series: { t: number; d: number }[], windowSize = 3): { t: number; d: number }[] {
  if (windowSize <= 1) return series;
  const half = Math.floor(windowSize / 2);
  return series.map((_, i) => {
    const lo = Math.max(0, i - half), hi = Math.min(series.length - 1, i + half);
    const slice = series.slice(lo, hi + 1);
    return { t: series[i].t, d: slice.reduce((a, s) => a + s.d, 0) / slice.length };
  });
}

// Vitesse instantanée par différences finies centrées (avant/arrière aux bords).
export function velocityCurve(series: { t: number; d: number }[]): { t: number; v: number }[] {
  const n = series.length;
  return series.map((s, i) => {
    const lo = i === 0 ? 0 : i - 1;
    const hi = i === n - 1 ? n - 1 : i + 1;
    const dt = series[hi].t - series[lo].t;
    const v = dt > 0 ? (series[hi].d - series[lo].d) / dt : 0;
    return { t: s.t, v };
  });
}

export function peakVelocity(curve: { t: number; v: number }[]): number {
  return curve.reduce((max, c) => Math.max(max, c.v), 0);
}

// Interpolation linéaire du temps auquel la distance atteint `target`,
// en cherchant le premier segment qui la franchit dans le sens croissant.
export function interpolateCrossingTime(series: { t: number; d: number }[], target: number): number | null {
  for (let i = 0; i < series.length - 1; i++) {
    const a = series[i], b = series[i + 1];
    if (a.d <= target && b.d >= target && b.d !== a.d) {
      const ratio = (target - a.d) / (b.d - a.d);
      return a.t + ratio * (b.t - a.t);
    }
  }
  return null;
}

// Franchissements d'une valeur cible dans les deux sens (utile pour un test
// bidirectionnel comme le 5-0-5, où la même ligne est franchie à l'aller
// puis au retour) — contrairement à interpolateCrossingTime qui ne cherche
// que le premier franchissement croissant.
export function findAllCrossings(series: { t: number; d: number }[], target: number, minGapS = 0.3): number[] {
  const crossings: number[] = [];
  for (let i = 0; i < series.length - 1; i++) {
    const a = series[i], b = series[i + 1];
    const crossesUp = a.d <= target && b.d >= target;
    const crossesDown = a.d >= target && b.d <= target;
    if ((crossesUp || crossesDown) && b.d !== a.d) {
      const ratio = (target - a.d) / (b.d - a.d);
      const t = a.t + ratio * (b.t - a.t);
      if (!crossings.length || t - crossings[crossings.length - 1] >= minGapS) crossings.push(t);
    }
  }
  return crossings;
}

export type Split = { distanceM: number; timeS: number };

// Splits relatifs au franchissement de la ligne de départ (distance = 0),
// elle-même interpolée plutôt que de supposer que le premier échantillon
// est exactement au départ.
export function computeSplits(series: { t: number; d: number }[], targets: number[]): Split[] {
  const t0 = interpolateCrossingTime(series, 0) ?? series[0]?.t ?? 0;
  const splits: Split[] = [];
  for (const target of targets) {
    const tx = interpolateCrossingTime(series, target);
    if (tx != null) splits.push({ distanceM: target, timeS: tx - t0 });
  }
  return splits;
}
