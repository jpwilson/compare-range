import type { LngLat } from '../geo/geodesy';
import { geodesicAnnulus, geodesicCircleOutline, greatCirclePoints } from '../geo/geodesy';

export interface RingSpec {
  id: string;
  name: string;
  color: string;
  rangeKm: number;
  /** Text drawn along the ring, e.g. "Rivian R1S · 660 km". */
  label: string;
}

const STEPS = 240;

/** Concentric bands: each annulus is coloured by the shortest-range vehicle that still reaches it. */
export function buildBands(origin: LngLat, rings: RingSpec[]): GeoJSON.FeatureCollection {
  const asc = rings.slice().sort((a, b) => a.rangeKm - b.rangeKm);
  const features: GeoJSON.Feature[] = [];
  let inner = 0;
  for (const r of asc) {
    if (r.rangeKm <= inner) continue; // duplicate radius — nothing to paint
    features.push({ type: 'Feature', id: r.id, properties: { id: r.id, color: r.color }, geometry: geodesicAnnulus(origin, r.rangeKm, inner, STEPS) });
    inner = r.rangeKm;
  }
  return { type: 'FeatureCollection', features };
}

/** Ring outlines (for the stroke and the along-line labels). */
export function buildOutlines(origin: LngLat, rings: RingSpec[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const r of rings) {
    const line = geodesicCircleOutline(origin, r.rangeKm, STEPS);
    if (line.length < 2) continue;
    features.push({ type: 'Feature', id: r.id, properties: { id: r.id, color: r.color, label: r.label, rangeKm: r.rangeKm }, geometry: { type: 'LineString', coordinates: line } });
  }
  return { type: 'FeatureCollection', features };
}

export function buildTrip(origin: LngLat | null, destination: LngLat | null): GeoJSON.FeatureCollection {
  if (!origin || !destination) return { type: 'FeatureCollection', features: [] };
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: greatCirclePoints(origin, destination, 128) } }] };
}

export const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

/** Bounds that contain the largest ring — or null when the ring is bigger than a hemisphere (show the globe). */
export function ringBounds(origin: LngLat, rings: RingSpec[], extra: LngLat[] = []): [[number, number], [number, number]] | null {
  const maxKm = rings.reduce((m, r) => Math.max(m, r.rangeKm), 0);
  const pts = [origin, ...extra];
  if (maxKm > 0) {
    if (maxKm >= 10000) return null;
    const outline = geodesicCircleOutline(origin, maxKm, 72);
    const span = Math.max(...outline.map(p => p[0])) - Math.min(...outline.map(p => p[0]));
    if (span >= 350 || outline.some(p => Math.abs(p[1]) > 84)) return null;
    pts.push(...outline);
  }
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of pts) { minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); }
  if (maxLon - minLon > 340) return null;
  return [[minLon, Math.max(-85, minLat)], [maxLon, Math.min(85, maxLat)]];
}
