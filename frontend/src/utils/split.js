// Trip cost shared equally by the driver and the riders.
// Riders pay the rounded-up share; the driver keeps whatever is left of the cost.

// Whole rupees, never negative; anything that isn't a number counts as 0
export const toRupees = (value) => Math.max(0, Math.round(Number(value) || 0));

// What each rider pays when `cost` is split between the driver and `riders` riders
export const splitShare = (cost, riders) => {
  const total = toRupees(cost);
  const n = Math.max(1, Math.floor(Number(riders) || 1));
  return total > 0 ? Math.ceil(total / (n + 1)) : 0;
};

// The driver's own part of the cost once every seat is paid
export const driverShare = (cost, riders) => {
  const n = Math.max(1, Math.floor(Number(riders) || 1));
  return Math.max(0, toRupees(cost) - splitShare(cost, n) * n);
};

// Rough one-way petrol cost from distance, rounded to ₹5, at least ₹10
export const PER_KM = { BIKE: 2.5, SCOOTY: 2.5, CAR: 7 };
export const estimateCost = (km, vehicleType) => {
  const rate = PER_KM[vehicleType] || PER_KM.CAR;
  return Math.max(10, Math.round((Number(km) * rate) / 5) * 5);
};
