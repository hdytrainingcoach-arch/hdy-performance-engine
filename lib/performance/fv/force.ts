// Force moyenne en phase de poussée — méthode Samozino (mesure sans
// plateforme de force, à partir de la hauteur de saut et de la distance
// de poussée).
//
// Dérivation (théorème de l'énergie / impulsion-travail), en supposant une
// accélération du centre de masse quasi uniforme sur la distance de poussée d :
//   (F_moy − m·g)·d = ½·m·v²           (travail net = énergie cinétique acquise)
//   v² = 2·g·h                          (vitesse de décollage, à partir du vol)
//   ⇒ F_moy = m·g·(1 + h/d)
//
// Référence : Samozino P, Morin JB et al., méthode simplifiée de mesure du
// profil force-vitesse en squat jump / countermovement jump sans plateforme
// de force. Formule reprise telle quelle — aucune simplification arbitraire.
import type { MeasurementMethod } from './types';

export type MeanForceInput = {
  totalMassKg: number;
  jumpHeightM: number;
  pushOffDistanceM: number;
  gravity: number;
};

export type MeanForceOutput = { meanForceN: number; meanForceRelativeNkg: number };

export function calculate_mean_force({ totalMassKg, jumpHeightM, pushOffDistanceM, gravity }: MeanForceInput): MeanForceOutput {
  if (totalMassKg <= 0) throw new Error('totalMassKg must be > 0');
  if (jumpHeightM <= 0) throw new Error('jumpHeightM must be > 0');
  if (pushOffDistanceM <= 0) throw new Error('pushOffDistanceM must be > 0');
  if (gravity <= 0) throw new Error('gravity must be > 0');
  const meanForceN = totalMassKg * gravity * (1 + jumpHeightM / pushOffDistanceM);
  return { meanForceN, meanForceRelativeNkg: meanForceN / totalMassKg };
}

export function powerFromForceAndVelocity(meanForceN: number, takeoffVelocityMs: number): number {
  // Puissance moyenne en poussée ≈ F_moy · v_moy, v_moy = v_décollage/2
  // (accélération uniforme supposée — même hypothèse que calculate_mean_force).
  return meanForceN * (takeoffVelocityMs / 2);
}

export const FORCE_MODEL_REFERENCE = 'Samozino et al. — méthode force sans plateforme (mean force = m·g·(1+h/d))' satisfies string;
export type { MeasurementMethod };
