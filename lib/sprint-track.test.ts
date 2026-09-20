import { describe, it, expect } from 'vitest';
import { pixelToDistanceM, toDistanceSeries, smooth, velocityCurve, peakVelocity, interpolateCrossingTime, computeSplits, findAllCrossings } from './sprint-track';

describe('pixelToDistanceM', () => {
  const cal = { xA: 100, xB: 300, distanceM: 5 }; // 200px = 5m -> 40px/m
  it('maps calibration points to 0 and the known distance', () => {
    expect(pixelToDistanceM(100, cal)).toBeCloseTo(0, 9);
    expect(pixelToDistanceM(300, cal)).toBeCloseTo(5, 9);
  });
  it('extrapolates linearly beyond the calibration span', () => {
    expect(pixelToDistanceM(500, cal)).toBeCloseTo(10, 9);
    expect(pixelToDistanceM(0, cal)).toBeCloseTo(-2.5, 9);
  });
  it('rejects identical calibration points', () => {
    expect(() => pixelToDistanceM(100, { xA: 100, xB: 100, distanceM: 5 })).toThrow();
  });
});

describe('toDistanceSeries + smooth', () => {
  it('converts a pixel series to a distance series', () => {
    const cal = { xA: 0, xB: 100, distanceM: 10 };
    const series = toDistanceSeries([{ t: 0, xPixel: 0 }, { t: 1, xPixel: 50 }, { t: 2, xPixel: 100 }], cal);
    expect(series).toEqual([{ t: 0, d: 0 }, { t: 1, d: 5 }, { t: 2, d: 10 }]);
  });
  it('smooths jitter with a moving average without shifting timestamps', () => {
    const series = [{ t: 0, d: 0 }, { t: 1, d: 10 }, { t: 2, d: 0 }, { t: 3, d: 10 }, { t: 4, d: 20 }];
    const smoothed = smooth(series, 3);
    expect(smoothed.map(s => s.t)).toEqual([0, 1, 2, 3, 4]);
    expect(smoothed[2].d).toBeCloseTo((10 + 0 + 10) / 3, 9);
  });
});

describe('velocityCurve + peakVelocity', () => {
  it('computes constant velocity for uniform motion', () => {
    const series = [0, 1, 2, 3, 4].map(t => ({ t, d: t * 5 })); // 5 m/s
    const curve = velocityCurve(series);
    curve.forEach(c => expect(c.v).toBeCloseTo(5, 9));
    expect(peakVelocity(curve)).toBeCloseTo(5, 9);
  });
  it('detects a peak in the middle of an accelerate-decelerate profile', () => {
    const series = [{ t: 0, d: 0 }, { t: 1, d: 2 }, { t: 2, d: 6 }, { t: 3, d: 8 }, { t: 4, d: 8.5 }];
    const curve = velocityCurve(series);
    expect(peakVelocity(curve)).toBeCloseTo(3, 9); // (8-2)/(3-1)
  });
});

describe('interpolateCrossingTime', () => {
  it('linearly interpolates the crossing time for a target distance', () => {
    const series = [{ t: 0, d: 0 }, { t: 1, d: 10 }];
    expect(interpolateCrossingTime(series, 5)).toBeCloseTo(0.5, 9);
  });
  it('returns null when the target distance is never reached', () => {
    const series = [{ t: 0, d: 0 }, { t: 1, d: 4 }];
    expect(interpolateCrossingTime(series, 10)).toBeNull();
  });
});

describe('findAllCrossings', () => {
  it('detects both an outbound and a return crossing of the same line (5-0-5)', () => {
    // Aller : d passe de 0 à 500 (px) ; retour : d repasse par 300 en sens inverse.
    const series = [
      { t: 0, d: 0 }, { t: 1, d: 300 }, { t: 1.5, d: 500 },
      { t: 2, d: 400 }, { t: 2.5, d: 300 }, { t: 3, d: 100 },
    ];
    const crossings = findAllCrossings(series, 300, 0.3);
    expect(crossings).toHaveLength(2);
    expect(crossings[0]).toBeCloseTo(1, 9);
    expect(crossings[1]).toBeCloseTo(2.5, 9);
  });
  it('deduplicates crossings closer than the minimum gap', () => {
    const series = [{ t: 0, d: 0 }, { t: 0.05, d: 10 }, { t: 0.1, d: 0 }];
    expect(findAllCrossings(series, 5, 0.3)).toHaveLength(1);
  });
});

describe('computeSplits', () => {
  it('computes split times relative to the interpolated start (distance = 0)', () => {
    // Départ à t=1 (avant ça, hors-cadre / immobile), puis 10 m/s constants.
    const series = [{ t: 0, d: -2 }, { t: 1, d: 0 }, { t: 1.5, d: 5 }, { t: 2, d: 10 }, { t: 3, d: 20 }];
    const splits = computeSplits(series, [5, 10, 20]);
    expect(splits).toEqual([
      { distanceM: 5, timeS: expect.closeTo(0.5, 9) },
      { distanceM: 10, timeS: expect.closeTo(1, 9) },
      { distanceM: 20, timeS: expect.closeTo(2, 9) },
    ]);
  });
  it('omits split distances never reached', () => {
    const series = [{ t: 0, d: 0 }, { t: 1, d: 8 }];
    expect(computeSplits(series, [5, 20])).toEqual([{ distanceM: 5, timeS: expect.closeTo(0.625, 9) }]);
  });
});
