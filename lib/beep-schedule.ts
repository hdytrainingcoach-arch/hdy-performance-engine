// Planification d'un test navette progressif (bips) — calcul purement physique
// (distance / vitesse), aucune table de protocole figée en dur, pour rester
// correct quel que soit le protocole (VAMEVAL, 30-15 IFT, Yo-Yo, Luc-Léger…)
// tel que configuré par le staff depuis sa fiche officielle.
export type Stage = { speedKmh: number; runS: number; recoveryS: number };
export type BeepSchedule = { beeps: number[]; stageStarts: number[]; totalS: number };

export function buildBeepSchedule(stages: Stage[], shuttleDistanceM: number): BeepSchedule {
  let t = 0;
  const beeps: number[] = [];
  const stageStarts: number[] = [];
  for (const s of stages) {
    stageStarts.push(t);
    const shuttleTimeS = shuttleDistanceM / ((s.speedKmh * 1000) / 3600);
    let elapsed = 0;
    while (elapsed + shuttleTimeS <= s.runS + 1e-6) {
      elapsed += shuttleTimeS;
      beeps.push(t + elapsed);
    }
    t += s.runS + s.recoveryS;
  }
  return { beeps, stageStarts, totalS: t };
}

export function stageIndexAt(stageStarts: number[], tS: number): number {
  let idx = 0;
  for (let i = 0; i < stageStarts.length; i++) if (tS >= stageStarts[i] - 1e-6) idx = i;
  return idx;
}

export function ift3015Stages(startKmh = 8, increment = 0.5, count = 17): Stage[] {
  return Array.from({ length: count }, (_, i) => ({ speedKmh: Math.round((startKmh + i * increment) * 10) / 10, runS: 30, recoveryS: 15 }));
}
