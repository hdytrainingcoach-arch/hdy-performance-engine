import { describe, it, expect } from 'vitest';
import { fitLine2D, projectOntoLine, fitMobius, applyMobius, signedDistanceFromLine } from './perspective-track';

// Simulation d'une caméra sténopé (pinhole) filmant une trajectoire 3D
// oblique (profondeur + dérive latérale), comme sur les vidéos terrain où
// le coureur s'éloigne en diagonale plutôt que de traverser le cadre à
// distance constante. P(d) = P0 + d·dir, projection u=f·Px/Pz, v=f·Py/Pz.
const P0 = { x: 2, y: 1, z: 10 };
const dir = { x: 0.3, y: 0, z: 1 };
const f = 1000;
function project(d: number, lateralOffset = 0) {
  const P = { x: P0.x + d * dir.x + lateralOffset, y: P0.y + d * dir.y, z: P0.z + d * dir.z };
  return { x: (f * P.x) / P.z, y: (f * P.y) / P.z };
}

describe('fitLine2D + projectOntoLine', () => {
  it('recovers a consistent 1D parameterization along a straight projected path', () => {
    const points = [0, 5, 10, 20].map(d => project(d));
    const line = fitLine2D(points);
    const ts = points.map(p => projectOntoLine(p, line));
    // Les paramètres doivent être strictement croissants (même ordre que d).
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
  });
  it('rejects fewer than 2 points', () => {
    expect(() => fitLine2D([{ x: 0, y: 0 }])).toThrow();
  });
});

describe('fitMobius + applyMobius', () => {
  it('exactly reconstructs distance at calibration points (no noise)', () => {
    const calibD = [0, 5, 10];
    const calibPts = calibD.map(d => ({ t: project(d).x, d }));
    const mob = fitMobius(calibPts);
    calibD.forEach(d => expect(applyMobius(mob, project(d).x)).toBeCloseTo(d, 6));
  });

  it('extrapolates correctly beyond the calibration range (exact pinhole model)', () => {
    const calibD = [0, 5, 10];
    const mob = fitMobius(calibD.map(d => ({ t: project(d).x, d })));
    [15, 20, 25].forEach(d => expect(applyMobius(mob, project(d).x)).toBeCloseTo(d, 6));
  });

  it('handles a full ground-plane pipeline: line fit + projection + Möbius, with realistic lateral noise staying small', () => {
    const calibD = [0, 5, 10, 20];
    const calibPix = calibD.map(d => project(d));
    const line = fitLine2D(calibPix);
    const calibT = calibPix.map(p => projectOntoLine(p, line));
    const mob = fitMobius(calibT.map((t, i) => ({ t, d: calibD[i] })));

    for (const d of [3, 8, 13, 18]) {
      const pix = project(d, 0.05); // 5 cm de dérive latérale (le pied ne suit jamais une ligne parfaite)
      const t = projectOntoLine(pix, line);
      const estimated = applyMobius(mob, t);
      expect(Math.abs(estimated - d)).toBeLessThan(1); // erreur bornée malgré le bruit latéral
    }
  });

  it('rejects fewer than 3 calibration points', () => {
    expect(() => fitMobius([{ t: 0, d: 0 }, { t: 1, d: 1 }])).toThrow();
  });

  it('rejects degenerate (aligned/insufficiently spread) calibration points', () => {
    expect(() => fitMobius([{ t: 1, d: 1 }, { t: 1, d: 1 }, { t: 1, d: 1 }])).toThrow();
  });
});

describe('signedDistanceFromLine', () => {
  it('returns 0 exactly on the line, opposite signs on either side', () => {
    const a = { x: 0, y: 0 }, b = { x: 10, y: 0 };
    expect(signedDistanceFromLine({ x: 5, y: 0 }, a, b)).toBeCloseTo(0, 9);
    const left = signedDistanceFromLine({ x: 5, y: -3 }, a, b);
    const right = signedDistanceFromLine({ x: 5, y: 3 }, a, b);
    expect(Math.sign(left)).not.toBe(Math.sign(right));
    expect(Math.abs(left)).toBeCloseTo(3, 9);
  });
  it('rejects coincident line points', () => {
    expect(() => signedDistanceFromLine({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toThrow();
  });
});
