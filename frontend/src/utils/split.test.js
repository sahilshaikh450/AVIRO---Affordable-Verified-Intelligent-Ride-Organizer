import { toRupees, splitShare, driverShare, estimateCost } from './split';

describe('cost split', () => {
  test('₹45 with 1 rider: rider pays ₹23, driver ₹22', () => {
    expect(splitShare(45, 1)).toBe(23);
    expect(driverShare(45, 1)).toBe(22);
  });

  test('₹45 with 2 riders: ₹15 each', () => {
    expect(splitShare(45, 2)).toBe(15);
    expect(driverShare(45, 2)).toBe(15);
  });

  test('riders never pay less than an equal share', () => {
    for (let cost = 1; cost <= 300; cost++) {
      for (let riders = 1; riders <= 4; riders++) {
        expect(splitShare(cost, riders) * (riders + 1)).toBeGreaterThanOrEqual(cost);
        expect(driverShare(cost, riders)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('empty, negative and junk input gives 0', () => {
    expect(splitShare('', 1)).toBe(0);
    expect(splitShare(-50, 1)).toBe(0);
    expect(splitShare('abc', 2)).toBe(0);
    expect(toRupees('44.6')).toBe(45);
  });

  test('bad rider counts fall back to one rider', () => {
    expect(splitShare(40, 0)).toBe(20);
    expect(splitShare(40, -3)).toBe(20);
  });

  test('distance estimate is rounded to ₹5 with a ₹10 minimum', () => {
    expect(estimateCost(8, 'CAR')).toBe(55);
    expect(estimateCost(8, 'BIKE')).toBe(20);
    expect(estimateCost(0.5, 'SCOOTY')).toBe(10);
    expect(estimateCost(10, 'UNKNOWN')).toBe(70);
  });
});
