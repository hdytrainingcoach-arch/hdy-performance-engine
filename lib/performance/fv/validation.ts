// Contrôles d'entrée (§19-20 du cahier des charges). Le moteur doit refuser
// le calcul plutôt que produire un chiffre sur des données invalides.
import { MIN_TRIALS_FOR_REGRESSION } from './constants';
import type { FvTestInput, ValidationIssue } from './types';

export function validateFvTestInput(input: FvTestInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.athleteId) issues.push({ code: 'missing_athlete', message: 'athleteId manquant.' });
  if (!(input.bodyMassKg > 0)) issues.push({ code: 'invalid_body_mass', message: 'body_mass_kg doit être > 0.' });
  if (!(input.pushOffDistanceM > 0)) issues.push({ code: 'invalid_push_off_distance', message: 'push_off_distance_m doit être > 0 (mesuré, pas estimé).' });
  if (input.gravity != null && !(input.gravity > 0)) issues.push({ code: 'invalid_gravity', message: 'gravity doit être > 0.' });

  const usableTrials = input.trials.filter(t => t.valid !== false);
  if (usableTrials.length < MIN_TRIALS_FOR_REGRESSION) {
    issues.push({ code: 'insufficient_trials', message: `Au moins ${MIN_TRIALS_FOR_REGRESSION} essais valides à des charges différentes sont nécessaires (${usableTrials.length} fourni(s)).` });
  }

  input.trials.forEach((t, i) => {
    const n = i + 1;
    if (t.additionalLoadKg < 0) issues.push({ code: 'negative_load', message: 'La charge additionnelle ne peut pas être négative.', trialNumber: n });
    if (!(t.jumpHeightM > 0)) issues.push({ code: 'invalid_jump_height', message: 'jump_height_m doit être > 0.', trialNumber: n });
  });

  const loads = usableTrials.map(t => t.additionalLoadKg);
  const distinctLoads = new Set(loads);
  if (usableTrials.length >= 2 && distinctLoads.size < 2) {
    issues.push({ code: 'no_load_variation', message: 'Les charges doivent varier entre les essais pour permettre une régression (toutes identiques sinon).' });
  }

  const seen = new Set<string>();
  input.trials.forEach((t, i) => {
    const key = `${t.additionalLoadKg}|${t.jumpHeightM}`;
    if (seen.has(key)) issues.push({ code: 'duplicate_trial', message: 'Essai identique (même charge, même hauteur) à un essai précédent — à vérifier.', trialNumber: i + 1 });
    seen.add(key);
  });

  return issues;
}

export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  const nonBlocking = new Set(['duplicate_trial']);
  return issues.some(i => !nonBlocking.has(i.code));
}
