// Calibration en perspective pour une caméra non perpendiculaire à la
// trajectoire (angle, éloignement variable — cas réel constaté sur les
// vidéos terrain : le coureur s'éloigne en profondeur, pas seulement
// latéralement, donc une règle de trois linéaire simple fausse les splits).
//
// Principe : une droite réelle en 3D (le couloir de course) se projette
// TOUJOURS sur une droite en 2D dans l'image d'une caméra sténopé (pinhole),
// quel que soit l'angle. La relation entre la distance réelle parcourue le
// long de cette droite et la position projetée sur la droite image est donc
// une homographie 1D (transformation de Möbius) : d(t) = (A·t + B)/(C·t + 1).
// Trois repères (distance connue + position pixel) suffisent à la
// déterminer exactement ; au-delà, ajustement aux moindres carrés.
//
// Vérifié numériquement par simulation d'une caméra sténopé avec une
// trajectoire oblique (profondeur + dérive latérale) : la reconstruction
// est exacte aux points de calibration et reste précise en interpolation
// et extrapolation modérée (voir perspective-track.test.ts).

export type Point2 = { x: number; y: number };
export type Line2 = { origin: Point2; dir: Point2 };
export type MobiusParams = { A: number; B: number; C: number };

// Droite 2D au sens des moindres carrés totaux (passe au mieux par les
// points, sans privilégier un axe) — utilisée pour définir la direction de
// la trajectoire à partir des repères de calibration.
export function fitLine2D(points: Point2[]): Line2 {
  const n = points.length;
  if (n < 2) throw new Error('fitLine2D requires at least 2 points');
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of points) {
    const dx = p.x - mx, dy = p.y - my;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { origin: { x: mx, y: my }, dir: { x: Math.cos(theta), y: Math.sin(theta) } };
}

// Paramètre 1D (abscisse curviligne) d'un point projeté sur la droite —
// absorbe les petits écarts latéraux (le pied ne suit jamais une ligne
// parfaitement droite) en ne gardant que la composante le long du couloir.
export function projectOntoLine(point: Point2, line: Line2): number {
  return (point.x - line.origin.x) * line.dir.x + (point.y - line.origin.y) * line.dir.y;
}

// Résout d = (A·t + B) / (C·t + 1) à partir de N≥3 couples (t, d) connus
// (résolution exacte pour N=3, moindres carrés au-delà).
// Dérivation : d·(C·t+1) = A·t+B  ⇒  A·t + B − C·(d·t) = d, linéaire en (A,B,C).
export function fitMobius(points: { t: number; d: number }[]): MobiusParams {
  if (points.length < 3) throw new Error('fitMobius requires at least 3 calibration points');
  const MtM = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const Mtb = [0, 0, 0];
  for (const { t, d } of points) {
    const row = [t, 1, -d * t];
    for (let i = 0; i < 3; i++) {
      Mtb[i] += row[i] * d;
      for (let j = 0; j < 3; j++) MtM[i][j] += row[i] * row[j];
    }
  }
  const [A, B, C] = solve3x3(MtM, Mtb);
  return { A, B, C };
}

export function applyMobius({ A, B, C }: MobiusParams, t: number): number {
  const denom = C * t + 1;
  if (denom === 0) throw new Error('Mobius denominator is zero at this t (hors du domaine de validité).');
  return (A * t + B) / denom;
}

// Distance signée d'un point à une droite définie par deux points — le
// signe indique de quel côté il se trouve ; un changement de signe au fil
// du temps = un franchissement de cette droite (utilisé pour le 5-0-5,
// où la ligne de chronométrage peut apparaître inclinée dans l'image si
// la caméra n'est pas parfaitement perpendiculaire).
export function signedDistanceFromLine(point: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) throw new Error('Les deux points de la ligne ne peuvent pas être confondus.');
  return (dx * (point.y - a.y) - dy * (point.x - a.x)) / len;
}

function solve3x3(M: number[][], b: number[]): number[] {
  const A = M.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    if (Math.abs(A[pivot][col]) < 1e-9) throw new Error('Repères de calibration dégénérés (alignés ou insuffisamment espacés) : le système est singulier.');
    [A[col], A[pivot]] = [A[pivot], A[col]];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const factor = A[r][col] / A[col][col];
      for (let c2 = col; c2 < 4; c2++) A[r][c2] -= factor * A[col][c2];
    }
  }
  return [A[0][3] / A[0][0], A[1][3] / A[1][1], A[2][3] / A[2][2]];
}
