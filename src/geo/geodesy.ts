/**
 * Geodesy helpers on a spherical Earth. Good to ~0.3% — plenty for range circles.
 * All angles in degrees, distances in km, coordinates as [lon, lat] (GeoJSON order).
 */
export type LngLat = [number, number];

export const EARTH_RADIUS_KM = 6371.0088;
export const KM_PER_MILE = 1.609344;
export const KM_PER_NMI = 1.852;

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** Great-circle distance in km. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const φ1 = a[1] * D2R, φ2 = b[1] * D2R;
  const dφ = φ2 - φ1, dλ = (b[0] - a[0]) * D2R;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Point reached by travelling `distKm` from `origin` along initial `bearingDeg` (0 = north, clockwise). */
export function destinationPoint(origin: LngLat, distKm: number, bearingDeg: number): LngLat {
  const δ = distKm / EARTH_RADIUS_KM, θ = bearingDeg * D2R;
  const φ1 = origin[1] * D2R, λ1 = origin[0] * D2R;
  const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), sinδ = Math.sin(δ), cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(Math.max(-1, Math.min(1, sinφ2)));
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return [normalizeLon(λ2 * R2D), φ2 * R2D];
}

/** Wrap a longitude into [-180, 180). */
export function normalizeLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

export function antipode(p: LngLat): LngLat {
  return [normalizeLon(p[0] + 180), -p[1]];
}

/** Evenly spaced points along the great circle from a to b (inclusive). */
export function greatCirclePoints(a: LngLat, b: LngLat, n = 64): LngLat[] {
  const φ1 = a[1] * D2R, λ1 = a[0] * D2R, φ2 = b[1] * D2R, λ2 = b[0] * D2R;
  const d = haversineKm(a, b) / EARTH_RADIUS_KM;
  if (d < 1e-9) return [a, b];
  const sinD = Math.sin(d);
  const pts: LngLat[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / sinD, B = Math.sin(f * d) / sinD;
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    pts.push([Math.atan2(y, x) * R2D, Math.atan2(z, Math.sqrt(x * x + y * y)) * R2D]);
  }
  return unwrapLongitudes(pts);
}

/**
 * Make a sequence of points longitude-continuous: each successive longitude is shifted by ±360
 * so that no step exceeds 180°. MapLibre (via geojson-vt's `wrap`) renders geometry with
 * longitudes in [-540, 540] correctly across the antimeridian, so we never split geometry.
 */
export function unwrapLongitudes(pts: LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  let prev: number | undefined;
  for (const [lon, lat] of pts) {
    let l = lon;
    if (prev !== undefined) {
      while (l - prev > 180) l -= 360;
      while (l - prev < -180) l += 360;
    }
    out.push([l, lat]);
    prev = l;
  }
  return out;
}

export type Ring = LngLat[];

/**
 * Boundary of the geodesic circle as a longitude-continuous ring (closed: first point repeated last).
 * Walks bearings 0..360 so the ring is oriented consistently for a given hemisphere.
 */
function circleBoundary(center: LngLat, radiusKm: number, steps: number): Ring {
  const pts: LngLat[] = [];
  for (let i = 0; i < steps; i++) pts.push(destinationPoint(center, radiusKm, (i * 360) / steps));
  const ring = unwrapLongitudes(pts);
  // Close the ring continuously: when the boundary winds around a pole the last point sits ~360° from the first.
  const first = ring[0], last = ring[ring.length - 1];
  ring.push([first[0] + 360 * Math.round((last[0] - first[0]) / 360), first[1]]);
  return ring;
}

function ringSpansAllLongitudes(ring: Ring): boolean {
  // After unwrapping, a ring that encloses a pole ends ~360° away from where it started.
  return Math.abs(ring[ring.length - 1][0] - ring[0][0]) > 180 || lonSpan(ring) >= 360 - 1e-6;
}
function lonSpan(ring: Ring): number {
  let min = Infinity, max = -Infinity;
  for (const [lon] of ring) { if (lon < min) min = lon; if (lon > max) max = lon; }
  return max - min;
}
/** Shift a whole ring by k·360° so its longitude midpoint lies in [-180, 180]. */
function recenterLongitudes(ring: Ring): Ring {
  let min = Infinity, max = -Infinity;
  for (const [lon] of ring) { if (lon < min) min = lon; if (lon > max) max = lon; }
  const shift = -360 * Math.round((min + max) / 2 / 360);
  return shift ? ring.map(([lon, lat]) => [lon + shift, lat] as LngLat) : ring;
}
function signedArea(ring: Ring): number {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return s / 2;
}
function ensureWinding(ring: Ring, counterClockwise: boolean): Ring {
  const ccw = signedArea(ring) > 0;
  return ccw === counterClockwise ? ring : ring.slice().reverse();
}

/**
 * GeoJSON polygon rings (outer first, then holes) for the set of points within `radiusKm` of `center`.
 * Handles: ordinary circles, circles crossing the antimeridian (longitudes are unwrapped, not split),
 * circles containing one pole (closed over the pole), and circles containing both poles / larger than
 * a hemisphere (expressed as the whole world minus the antipodal circle).
 */
export function geodesicCircleRings(center: LngLat, radiusKm: number, steps = 180): Ring[] {
  const halfCircumference = Math.PI * EARTH_RADIUS_KM;
  if (radiusKm <= 0) return [];
  if (radiusKm >= halfCircumference - 1) return [worldRing()];

  const distToNorthPole = (90 - center[1]) * D2R * EARTH_RADIUS_KM;
  const distToSouthPole = (90 + center[1]) * D2R * EARTH_RADIUS_KM;
  const hasNorth = radiusKm > distToNorthPole;
  const hasSouth = radiusKm > distToSouthPole;

  if (hasNorth && hasSouth) {
    // Everything except the antipodal circle (which then contains neither pole).
    const hole = recenterLongitudes(circleBoundary(antipode(center), halfCircumference - radiusKm, steps));
    const holeCenterLon = (Math.min(...hole.map(p => p[0])) + Math.max(...hole.map(p => p[0]))) / 2;
    const outer: Ring = [
      [holeCenterLon - 180, -90], [holeCenterLon + 180, -90], [holeCenterLon + 180, 90], [holeCenterLon - 180, 90], [holeCenterLon - 180, -90],
    ];
    return [ensureWinding(outer, true), ensureWinding(hole, false)];
  }

  const ring = recenterLongitudes(circleBoundary(center, radiusKm, steps));
  if (!hasNorth && !hasSouth) return [ensureWinding(ring, true)];

  // Exactly one pole inside: the boundary winds once around the globe. Close it over that pole.
  const poleLat = hasNorth ? 90 : -90;
  let open = ring.slice(0, -1); // drop the duplicated closing point
  if (!ringSpansAllLongitudes(ring)) {
    // Numerical edge case (radius ≈ distance to pole): still treat as a pole cap.
    open = unwrapLongitudes(open);
  }
  // Rotate so the sequence starts at its minimum longitude, then walk to min+360.
  let startIdx = 0;
  for (let i = 1; i < open.length; i++) if (open[i][0] < open[startIdx][0]) startIdx = i;
  const rotated = open.slice(startIdx).concat(open.slice(0, startIdx));
  const walked = unwrapLongitudes(rotated);
  // Ensure monotonic direction: if longitudes decrease overall, reverse to make them increase.
  if (walked[walked.length - 1][0] < walked[0][0]) walked.reverse();
  const first = walked[0];
  const closed: Ring = walked.concat([[first[0] + 360, first[1]], [first[0] + 360, poleLat], [first[0], poleLat], [first[0], first[1]]]);
  return [ensureWinding(recenterLongitudes(closed), true)];
}

/**
 * Just the boundary of the circle as a longitude-continuous line (no pole caps, no world box) —
 * what a stroke or a label-along-line should follow. Empty when the circle covers the whole globe.
 */
export function geodesicCircleOutline(center: LngLat, radiusKm: number, steps = 180): LngLat[] {
  const halfCircumference = Math.PI * EARTH_RADIUS_KM;
  if (radiusKm <= 0 || radiusKm >= halfCircumference - 1) return [];
  const distToNorthPole = (90 - center[1]) * D2R * EARTH_RADIUS_KM;
  const distToSouthPole = (90 + center[1]) * D2R * EARTH_RADIUS_KM;
  if (radiusKm > distToNorthPole && radiusKm > distToSouthPole) {
    return recenterLongitudes(circleBoundary(antipode(center), halfCircumference - radiusKm, steps));
  }
  return recenterLongitudes(circleBoundary(center, radiusKm, steps));
}

export function worldRing(): Ring {
  return [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
}

/** GeoJSON Polygon geometry for a geodesic circle. */
export function geodesicCirclePolygon(center: LngLat, radiusKm: number, steps = 180): GeoJSON.Polygon {
  return { type: 'Polygon', coordinates: geodesicCircleRings(center, radiusKm, steps) };
}

/**
 * Annulus: points within `outerKm` but not within `innerKm` of `center` (innerKm may be 0).
 * Rendered as a polygon with the inner circle as a hole; falls back to a MultiPolygon when the
 * inner circle is itself the "world minus antipode" shape (it then has its own hole).
 */
export function geodesicAnnulus(center: LngLat, outerKm: number, innerKm: number, steps = 180): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  const outer = geodesicCircleRings(center, outerKm, steps);
  if (innerKm <= 0) return { type: 'Polygon', coordinates: outer };
  const inner = geodesicCircleRings(center, innerKm, steps);
  if (inner.length === 1) {
    // Hole must wind opposite to the outer ring.
    const hole = ensureWinding(inner[0], false);
    return { type: 'Polygon', coordinates: [...outer, hole] };
  }
  // Inner is world-minus-antipode (outer ring = world, hole = antipodal circle). Then the annulus is
  // exactly the region between the two antipodal circles: outer's antipodal hole becomes an outer ring.
  // outer (radius R1) = world minus hole H1; inner (radius R2 < R1) = world minus hole H2 (H2 ⊃ H1).
  // annulus = H2 minus H1.
  const h2 = ensureWinding(inner[1], true);
  const h1 = outer.length === 2 ? ensureWinding(outer[1], false) : undefined;
  return { type: 'Polygon', coordinates: h1 ? [h2, h1] : [h2] };
}

export function kmToUnit(km: number, unit: 'km' | 'mi' | 'nmi'): number {
  return unit === 'km' ? km : unit === 'mi' ? km / KM_PER_MILE : km / KM_PER_NMI;
}
export function unitLabel(unit: 'km' | 'mi' | 'nmi'): string {
  return unit === 'nmi' ? 'nm' : unit;
}
export function formatDistance(km: number, unit: 'km' | 'mi' | 'nmi', opts: { digits?: number } = {}): string {
  const v = kmToUnit(km, unit);
  const digits = opts.digits ?? (v < 10 ? 1 : 0);
  return `${v.toLocaleString('en-US', { maximumFractionDigits: digits })} ${unitLabel(unit)}`;
}
