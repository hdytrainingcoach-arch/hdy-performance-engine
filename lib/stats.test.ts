import { describe, expect, it } from 'vitest';
import {
  fmtNum, fmtPct, mean, median, pctChange, percentile, reviewSignal,
  stddev, summarize, toNum, zScore,
} from '@/lib/stats';

describe('toNum', () => {
  it('convertit les valeurs numériques valides', () => {
    expect(toNum('4')).toBe(4);
    expect(toNum(4.5)).toBe(4.5);
  });
  it('renvoie null pour les valeurs non numériques', () => {
    expect(toNum('abc')).toBeNull();
    expect(toNum(null)).toBeNull();
    expect(toNum(undefined)).toBeNull();
    expect(toNum(NaN)).toBeNull();
  });
});

describe('mean / median / stddev / percentile', () => {
  it('renvoient null sur un tableau vide', () => {
    expect(mean([])).toBeNull();
    expect(median([])).toBeNull();
    expect(stddev([])).toBeNull();
    expect(percentile([], 0.5)).toBeNull();
  });
  it('stddev renvoie null avec une seule valeur (échantillon n-1)', () => {
    expect(stddev([5])).toBeNull();
  });
  it('calcule la moyenne', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });
  it('calcule la médiane (pair et impair)', () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('calcule un écart-type d’échantillon connu', () => {
    // 2,4,4,4,5,5,7,9 -> écart-type d'échantillon = 2.13809...
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.1381, 3);
  });
  it('percentile est robuste aux entrées non triées', () => {
    expect(percentile([5, 1, 3, 2, 4], 1)).toBe(5);
    expect(percentile([5, 1, 3, 2, 4], 0)).toBe(1);
  });
});

describe('pctChange / zScore', () => {
  it('pctChange calcule une variation relative', () => {
    expect(pctChange(120, 100)).toBeCloseTo(0.2, 5);
    expect(pctChange(80, 100)).toBeCloseTo(-0.2, 5);
  });
  it('pctChange est null si une entrée manque ou si la référence est nulle', () => {
    expect(pctChange(null, 100)).toBeNull();
    expect(pctChange(100, null)).toBeNull();
    expect(pctChange(100, 0)).toBeNull();
  });
  it('zScore calcule un écart normalisé', () => {
    expect(zScore(15, 10, 5)).toBe(1);
  });
  it('zScore est null si l’écart-type est nul ou une entrée manque', () => {
    expect(zScore(15, 10, 0)).toBeNull();
    expect(zScore(null, 10, 5)).toBeNull();
  });
});

describe('summarize — fenêtres glissantes 7/28 jours (CA-10)', () => {
  const asOf = new Date('2026-09-11T12:00:00Z');
  const daysAgo = (n: number) => new Date(asOf.getTime() - n * 86_400_000).toISOString();

  it('sépare correctement les fenêtres 7 et 28 jours', () => {
    const rows = [
      { date: daysAgo(0), value: 20 }, // aujourd'hui = "last"
      { date: daysAgo(3), value: 10 }, // dans les deux fenêtres
      { date: daysAgo(10), value: 30 }, // seulement 28 jours
      { date: daysAgo(40), value: 999 }, // hors des deux fenêtres — ignoré
    ];
    const s = summarize(rows, asOf);
    expect(s.last).toBe(20);
    expect(s.mean7).toBe(15); // (20+10)/2
    expect(s.mean28).toBe(20); // (20+10+30)/3
    expect(s.n).toBe(3);
  });

  it('ignore les valeurs manquantes/non numériques sans planter', () => {
    const rows = [
      { date: daysAgo(0), value: null },
      { date: 'date-invalide', value: 5 },
      { date: daysAgo(1), value: 8 },
    ];
    const s = summarize(rows, asOf);
    expect(s.n).toBe(1);
    expect(s.last).toBe(8);
  });

  it('renvoie une structure "tout null" pour une série vide (donnée manquante affichée, jamais imputée)', () => {
    const s = summarize([], asOf);
    expect(s).toMatchObject({ n: 0, last: null, mean7: null, mean28: null, median28: null, sd28: null, pctVs28: null, z28: null });
  });
});

describe('reviewSignal — statuts vert/orange/rouge/gris (CA-09, jamais d’exclusion auto)', () => {
  const base = {
    respondedToday: true, hooperLast: 10, hooperMean28: 10, hooperSd28: 2,
    painMax: null as number | null, unusualSymptom: false, srpeLast: 300, srpeMean7: 300, acwr: 1,
  };

  it('rouge si symptôme inhabituel, quoi qu’il arrive par ailleurs', () => {
    expect(reviewSignal({ ...base, unusualSymptom: true }).level).toBe('red');
  });
  it('rouge si douleur ≥ 7', () => {
    expect(reviewSignal({ ...base, painMax: 8 }).level).toBe('red');
  });
  it('orange si douleur modérée (4-6), même signal isolé', () => {
    const r = reviewSignal({ ...base, painMax: 5 });
    expect(r.level).toBe('orange');
    expect(r.reasons.join(' ')).toMatch(/douleur modérée/i);
  });
  it('un seul signal dégradé (hors douleur) reste vert mais garde la raison visible — le brief exige "plusieurs" signaux pour l’orange', () => {
    const r = reviewSignal({ ...base, hooperLast: 20, hooperMean28: 10, hooperSd28: 2 });
    expect(r.level).toBe('green');
    expect(r.reasons.join(' ')).toMatch(/Hooper nettement au-dessus/i);
  });
  it('deux signaux dégradés simultanés (Hooper + charge) déclenchent l’orange', () => {
    const r = reviewSignal({ ...base, hooperLast: 20, hooperMean28: 10, hooperSd28: 2, srpeLast: 500, srpeMean7: 300 });
    expect(r.level).toBe('orange');
  });
  it('orange si sRPE en pic vs 7 jours et ACWR élevé (deux signaux dégradés)', () => {
    const r = reviewSignal({ ...base, srpeLast: 500, srpeMean7: 300, acwr: 1.4 });
    expect(r.level).toBe('orange');
  });
  it('gris si aucune réponse aujourd’hui et rien à signaler', () => {
    const r = reviewSignal({ ...base, respondedToday: false });
    expect(r.level).toBe('gray');
  });
  it('vert si tout est proche de l’habitude et le joueur a répondu', () => {
    const r = reviewSignal({ ...base });
    expect(r.level).toBe('green');
  });
  it('ne renvoie jamais un niveau hors de l’énumération autorisée (pas de diagnostic caché)', () => {
    const levels = new Set(['green', 'orange', 'red', 'gray']);
    for (const painMax of [null, 0, 3, 5, 8]) {
      expect(levels.has(reviewSignal({ ...base, painMax }).level)).toBe(true);
    }
  });
});

describe('formatage', () => {
  it('fmtPct affiche le signe et gère null', () => {
    expect(fmtPct(0.256, 1)).toBe('+25.6 %');
    expect(fmtPct(-0.1)).toBe('-10 %');
    expect(fmtPct(null)).toBe('—');
  });
  it('fmtNum arrondit et gère null', () => {
    expect(fmtNum(3.14159, 2)).toBe('3.14');
    expect(fmtNum(null)).toBe('—');
  });
});
