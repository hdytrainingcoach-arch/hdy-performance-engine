// Formules HDY LAB — mesures vidéo terrain (sans plateforme de force).
// Références : temps de vol (Bosco 1983), impulsion-quantité de mouvement en phase de poussée.
export const G = 9.81;

export function heightFromFlightMs(flightMs: number): number {
  return (G * Math.pow(flightMs / 1000, 2) / 8) * 100; // cm
}

export function takeoffVelocity(heightCm: number): number {
  return Math.sqrt(2 * G * (heightCm / 100)); // m/s
}

export type ForcePower = { forceN: number; powerW: number; relF: number; relP: number };

// Force et puissance moyennes en phase de poussée, par impulsion-quantité de mouvement :
// F_moy - m·g = m·v0/t_prop  (accélération uniforme supposée, v_moy = v0/2)
export function forcePowerFromPropulsion(bodyMassKg: number, heightCm: number, propulsionMs: number): ForcePower | null {
  if (!bodyMassKg || !propulsionMs || propulsionMs <= 0) return null;
  const v0 = takeoffVelocity(heightCm);
  const tProp = propulsionMs / 1000;
  const forceN = bodyMassKg * (v0 / tProp + G);
  const powerW = forceN * (v0 / 2);
  return { forceN, powerW, relF: forceN / bodyMassKg, relP: powerW / bodyMassKg };
}

export function imbalancePct(left: number, right: number): number {
  const max = Math.max(left, right), min = Math.min(left, right);
  return max > 0 ? ((max - min) / max) * 100 : 0;
}
