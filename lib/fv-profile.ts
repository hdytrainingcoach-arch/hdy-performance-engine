// Profil force-vitesse par sauts chargés (méthode Samozino et al. 2008/2012,
// mesure vidéo sans plateforme de force).
import { G, takeoffVelocity } from './lab-calc';

export type FvTrial = { loadKg: number; heightCm: number };
export type FvProfile = { f0: number; v0: number; sfv: number; pmax: number; points: { v: number; f: number }[] };

// Force moyenne en poussée par le théorème de l'énergie (démonstration impulsion-travail) :
// (F - m·g)·d = ½·m·v² ⇒ F = m·g·(1 + h/d)
export function forceFromLoadedJump(bodyMassKg: number, loadKg: number, heightCm: number, pushOffDistanceCm: number): { v: number; f: number } {
  const m = bodyMassKg + loadKg;
  const h = heightCm / 100;
  const d = pushOffDistanceCm / 100;
  const v = takeoffVelocity(heightCm);
  const f = m * G * (1 + h / d);
  return { v, f };
}

// Régression linéaire F = F0 + Sfv·v sur les essais chargés.
export function computeFvProfile(trials: FvTrial[], bodyMassKg: number, pushOffDistanceCm: number): FvProfile | null {
  if (trials.length < 2 || !bodyMassKg || !pushOffDistanceCm) return null;
  const points = trials.map(t => forceFromLoadedJump(bodyMassKg, t.loadKg, t.heightCm, pushOffDistanceCm));
  const n = points.length;
  const meanV = points.reduce((a, p) => a + p.v, 0) / n;
  const meanF = points.reduce((a, p) => a + p.f, 0) / n;
  const covVF = points.reduce((a, p) => a + (p.v - meanV) * (p.f - meanF), 0);
  const varV = points.reduce((a, p) => a + (p.v - meanV) ** 2, 0);
  if (varV === 0) return null;
  const sfv = covVF / varV;
  const f0 = meanF - sfv * meanV;
  const v0 = -f0 / sfv;
  const pmax = (f0 * v0) / 4;
  return { f0, v0, sfv, pmax, points };
}
