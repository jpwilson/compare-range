import { describe, expect, it } from 'vitest';
import type { Vehicle } from '../data/types';
import { estimateTrip, formatDuration } from './trip';

const ev = (rangeKm: number, fastChargeMin = 27): Vehicle => ({
  id: 't', name: 'T', make: 'T', category: 'ev', rangeKm, basis: 'test',
  charge: { usableKwh: 75, fastChargeMin, peakKw: 250 },
});
const gas = (rangeKm: number): Vehicle => ({ id: 'g', name: 'G', make: 'G', category: 'car', rangeKm, basis: 'test' });
const jet = (rangeKm: number, cruiseKph?: number): Vehicle => ({ id: 'j', name: 'J', make: 'J', category: 'jet', rangeKm, basis: 'test', cruiseKph });

describe('estimateTrip', () => {
  it('short EV trip is nonstop with no stop time', () => {
    const e = estimateTrip(ev(500), 300); // path 360 km <= 450
    expect(e.nonstop).toBe(true);
    expect(e.stops).toBe(0);
    expect(e.stopsMin).toBe(0);
    expect(e.movingMin).toBeCloseTo((360 / 105) * 60, 5);
    expect(e.totalMin).toBeCloseTo(e.movingMin, 5);
  });

  it('EV first leg runs to 90%, later legs 70%', () => {
    // range 500: first leg 450, later legs 350. Path 800 → 1 stop; path 801 → still 1; path 1150 → exactly 2 legs; 1151 → 3rd leg needed.
    expect(estimateTrip(ev(500), 800 / 1.2).stops).toBe(1);
    expect(estimateTrip(ev(500), 1150 / 1.2).stops).toBe(2);
    expect(estimateTrip(ev(500), 1151 / 1.2).stops).toBe(3);
  });

  it('EV stop time = (fastChargeMin + 5) per stop', () => {
    const e = estimateTrip(ev(500, 27), 800 / 1.2);
    expect(e.stopKind).toBe('charge');
    expect(e.stopsMin).toBe(32);
  });

  it('EV without charge data falls back to the category default', () => {
    const v = { ...ev(500), charge: undefined };
    const e = estimateTrip(v, 800 / 1.2);
    expect(e.stopsMin).toBe(40); // 35 default + 5 plug
  });

  it('gas car stops = ceil(path/range) - 1', () => {
    expect(estimateTrip(gas(700), 690 / 1.2).stops).toBe(0);
    expect(estimateTrip(gas(700), 701 / 1.2).stops).toBe(1);
    expect(estimateTrip(gas(700), 1401 / 1.2).stops).toBe(2);
  });

  it('ground path uses the 1.2 road factor, aircraft 1.05', () => {
    expect(estimateTrip(gas(700), 100).pathKm).toBeCloseTo(120, 5);
    expect(estimateTrip(jet(6000), 100).pathKm).toBeCloseTo(105, 5);
  });

  it('aircraft add fixed overhead and per-vehicle cruise overrides the default', () => {
    const e = estimateTrip(jet(6000, 900), 900 / 1.05);
    expect(e.overheadMin).toBe(40);
    expect(e.movingMin).toBeCloseTo(60, 5);
    expect(e.totalMin).toBeCloseTo(100, 5);
  });

  it('never returns negative stops for a zero-distance trip', () => {
    const e = estimateTrip(gas(700), 0);
    expect(e.stops).toBe(0);
    expect(e.totalMin).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats minutes, hours and days', () => {
    expect(formatDuration(38)).toBe('38 m');
    expect(formatDuration(260)).toBe('4 h 20 m');
    expect(formatDuration(60 * 50)).toBe('2 d 2 h');
  });
});
