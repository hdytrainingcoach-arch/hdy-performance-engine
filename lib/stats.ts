// Statistiques descriptives pour la comparaison « le joueur à lui-même ».
// Aucune décision automatique : ces fonctions décrivent, elles ne concluent pas.

export function toNum(v: unknown): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export function mean(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const a = [...xs].sort((p, q) => p - q);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Écart-type d'échantillon (n-1). null si moins de 2 valeurs. */
export function stddev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

export function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const i = Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1));
  return a[i];
}

/** Variation en % d'une valeur par rapport à une référence. null si pas calculable. */
export function pctChange(value: number | null, ref: number | null): number | null {
  if (value === null || ref === null || ref === 0) return null;
  return (value - ref) / ref;
}

export function zScore(value: number | null, m: number | null, sd: number | null): number | null {
  if (value === null || m === null || sd === null || sd === 0) return null;
  return (value - m) / sd;
}

export type Summary = {
  n: number;
  last: number | null;
  mean7: number | null;
  mean28: number | null;
  median28: number | null;
  sd28: number | null;
  pctVs28: number | null; // (last - mean28) / mean28
  z28: number | null; // (last - mean28) / sd28
};

type Dated = { date: string | Date; value: number | null };

/**
 * Résume une série datée par fenêtres glissantes se terminant à `asOf` (défaut : maintenant).
 * `last` = valeur la plus récente (toutes fenêtres confondues).
 */
export function summarize(rows: Dated[], asOf: Date = new Date()): Summary {
  const clean = rows
    .map((r) => ({ t: new Date(r.date).getTime(), v: r.value }))
    .filter((r): r is { t: number; v: number } => Number.isFinite(r.t) && r.v !== null && Number.isFinite(r.v))
    .sort((a, b) => b.t - a.t);

  const end = asOf.getTime();
  const day = 86_400_000;
  const win = (days: number) => clean.filter((r) => r.t <= end && r.t >= end - days * day).map((r) => r.v);

  const w7 = win(7);
  const w28 = win(28);
  const last = clean.length ? clean[0].v : null;
  const m28 = mean(w28);
  const sd = stddev(w28);

  return {
    n: w28.length,
    last,
    mean7: mean(w7),
    mean28: m28,
    median28: median(w28),
    sd28: sd,
    pctVs28: pctChange(last, m28),
    z28: zScore(last, m28, sd),
  };
}

export type SignalLevel = 'green' | 'orange' | 'red' | 'gray';

/**
 * Statut de revue, transparent et explicable (cahier des charges §6).
 * Ce n'est ni un diagnostic ni une exclusion : il déclenche une revue humaine.
 */
export function reviewSignal(input: {
  respondedToday: boolean;
  hooperLast: number | null;
  hooperMean28: number | null;
  hooperSd28: number | null;
  painMax: number | null; // 0..10 sur la période récente
  unusualSymptom: boolean;
  srpeLast: number | null;
  srpeMean7: number | null;
  acwr: number | null;
}): { level: SignalLevel; reasons: string[] } {
  const reasons: string[] = [];

  if (input.unusualSymptom) reasons.push('Symptôme inhabituel signalé');
  if (input.painMax !== null && input.painMax >= 7) reasons.push(`Douleur élevée (${input.painMax}/10)`);
  if (input.unusualSymptom || (input.painMax !== null && input.painMax >= 7)) {
    return { level: 'red', reasons };
  }

  let degraded = 0;
  if (input.painMax !== null && input.painMax >= 4) {
    reasons.push(`Douleur modérée (${input.painMax}/10)`);
    degraded += 1;
  }
  const hz = zScore(input.hooperLast, input.hooperMean28, input.hooperSd28);
  if (
    (hz !== null && hz >= 1.5) ||
    (input.hooperLast !== null && input.hooperMean28 !== null && input.hooperLast >= input.hooperMean28 * 1.3)
  ) {
    reasons.push('Hooper nettement au-dessus de l’habitude');
    degraded += 1;
  }
  const sp = pctChange(input.srpeLast, input.srpeMean7);
  if (sp !== null && sp >= 0.5) {
    reasons.push('Charge interne en pic vs 7 jours');
    degraded += 1;
  }
  if (input.acwr !== null && input.acwr >= 1.3) {
    reasons.push(`ACWR ${input.acwr.toFixed(2)}`);
    degraded += 1;
  }

  if (degraded >= 2 || (input.painMax !== null && input.painMax >= 4)) {
    return { level: 'orange', reasons };
  }
  if (!input.respondedToday) {
    return { level: 'gray', reasons: ['Pas de réponse aujourd’hui'] };
  }
  return { level: 'green', reasons: reasons.length ? reasons : ['Proche de l’habitude'] };
}

export function fmtPct(v: number | null, digits = 0): string {
  if (v === null) return '—';
  const s = (v * 100).toFixed(digits);
  return `${v > 0 ? '+' : ''}${s} %`;
}

export function fmtNum(v: number | null, digits = 1): string {
  if (v === null) return '—';
  return v.toFixed(digits);
}
