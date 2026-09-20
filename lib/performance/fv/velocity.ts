// Vitesse de décollage à partir de la hauteur de saut : v = sqrt(2·g·h).
// Valable quelle que soit la méthode de mesure de h (temps de vol, mesure
// directe...) — measurementMethod est conservé pour traçabilité, pas pour
// changer la formule.
import type { MeasurementMethod } from './types';

export function takeoffVelocityFromHeight(jumpHeightM: number, gravity: number): number {
  if (jumpHeightM <= 0) throw new Error('jumpHeightM must be > 0');
  if (gravity <= 0) throw new Error('gravity must be > 0');
  return Math.sqrt(2 * gravity * jumpHeightM);
}

export function resolveMeasurementMethod(method?: MeasurementMethod): MeasurementMethod {
  return method ?? 'other';
}
