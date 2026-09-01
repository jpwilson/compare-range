/**
 * Distance → time. Deliberately simple, explainable arithmetic — every figure
 * carries a `basis` string so the UI never shows a number it can't defend.
 *
 * Ground vehicles: great-circle × pathFactor (roads wind), category cruise speed.
 * EVs: leave full, arrive at 10% — first leg = 0.9 × range, every later leg runs
 * the 10→80% fast-charge window = 0.7 × range.
 * Aircraft: near-direct path plus fixed block-time overhead (taxi/climb/descent —
 * and for airliners, the airport itself).
 */
import { CATEGORIES } from '../data/categories';
import type { Vehicle } from '../data/types';

export interface TripEstimate {
  /** Estimated real path in km (great-circle × the category's path factor). */
  pathKm: number;
  /** Refuel / recharge stops along the way. */
  stops: number;
  stopKind: 'charge' | 'fuel';
  movingMin: number;
  stopsMin: number;
  overheadMin: number;
  totalMin: number;
  /** True when the trip needs no stops. */
  nonstop: boolean;
  /** Human-readable assumptions, e.g. "≈1.2× road distance at 105 km/h · charge stops 10–80%". */
  basis: string;
}

/** Extra minutes per charge stop beyond the 10→80% curve: exit, plug in, pay. */
const CHARGE_PLUG_MIN = 5;

/** ceil() that doesn't add a phantom stop when float noise lands a hair past a leg boundary. */
const ceilSafe = (x: number) => Math.ceil(x - 1e-9);

function isBattery(v: Vehicle): boolean {
  return v.category === 'ev' || Boolean(v.charge);
}

export function estimateTrip(v: Vehicle, greatCircleKm: number): TripEstimate {
  const cat = CATEGORIES[v.category];
  const pathKm = greatCircleKm * cat.pathFactor;
  const speed = v.cruiseKph ?? cat.cruiseKph;
  const movingMin = (pathKm / speed) * 60;
  const r = v.rangeKm;

  let stops: number;
  let perStopMin: number;
  let stopKind: 'charge' | 'fuel';
  if (isBattery(v)) {
    stopKind = 'charge';
    stops = pathKm <= 0.9 * r + 1e-6 ? 0 : ceilSafe((pathKm - 0.9 * r) / (0.7 * r));
    perStopMin = (v.charge?.fastChargeMin ?? cat.stopMin) + CHARGE_PLUG_MIN;
  } else {
    stopKind = 'fuel';
    stops = Math.max(0, ceilSafe(pathKm / r) - 1);
    perStopMin = cat.stopMin;
  }

  const stopsMin = stops * perStopMin;
  const overheadMin = cat.overheadMin;
  const speedNote = v.speedBasis ?? `${speed} km/h typical`;
  const parts = [
    cat.pathFactor > 1.1 ? `≈${cat.pathFactor}× road distance` : 'near-direct path',
    speedNote,
    stops > 0 ? (stopKind === 'charge' ? 'charge stops 10–80%' : `${perStopMin} min per stop`) : null,
    overheadMin > 0 ? `+${overheadMin} min ground time` : null,
  ].filter(Boolean);

  return {
    pathKm,
    stops,
    stopKind,
    movingMin,
    stopsMin,
    overheadMin,
    totalMin: movingMin + stopsMin + overheadMin,
    nonstop: stops === 0,
    basis: parts.join(' · '),
  };
}

/** "4 h 20 m", "38 m", "3 d 2 h" — compact, monospace-friendly. */
export function formatDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} m`;
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24} h`;
}
