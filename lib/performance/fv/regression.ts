// Régression linéaire générique F = a·V + b (moindres carrés), utilisée
// pour obtenir F0 (=b) et Sfv (=a) à partir des essais chargés.
export type Point = { x: number; y: number };
export type LinearRegression = { slope: number; intercept: number; rSquared: number; standardError: number; n: number };

export function linearRegression(points: Point[]): LinearRegression {
  const n = points.length;
  if (n < 2) throw new Error('linearRegression requires at least 2 points');
  const meanX = points.reduce((a, p) => a + p.x, 0) / n;
  const meanY = points.reduce((a, p) => a + p.y, 0) / n;
  const covXY = points.reduce((a, p) => a + (p.x - meanX) * (p.y - meanY), 0);
  const varX = points.reduce((a, p) => a + (p.x - meanX) ** 2, 0);
  if (varX === 0) throw new Error('linearRegression requires variation in x (velocities must differ across trials)');
  const slope = covXY / varX;
  const intercept = meanY - slope * meanX;

  const ssTot = points.reduce((a, p) => a + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((a, p) => {
    const predicted = slope * p.x + intercept;
    return a + (p.y - predicted) ** 2;
  }, 0);
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const standardError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  return { slope, intercept, rSquared, standardError, n };
}
