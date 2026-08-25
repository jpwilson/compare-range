import { describe, it, expect } from 'vitest';
import earcut from 'earcut';
import { antipode, geodesicCircleOutline, destinationPoint, geodesicAnnulus, geodesicCircleRings, greatCirclePoints, haversineKm, normalizeLon, unwrapLongitudes, type LngLat } from './geodesy';

const PHX: LngLat = [-112.07, 33.45];
const DEN: LngLat = [-104.99, 39.74];
const LHR: LngLat = [-0.4614, 51.4775];
const SYD: LngLat = [151.1772, -33.9461];

// Point-in-polygon on the unwrapped lon/lat plane (ray casting), testing lon and lon±360.
function inRings(rings: LngLat[][], p: LngLat): boolean {
  const test = (ring: LngLat[], x: number, y: number) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const anyShift = (ring: LngLat[]) => [p[0], p[0] + 360, p[0] - 360].some(x => test(ring, x, p[1]));
  if (!anyShift(rings[0])) return false;
  for (const hole of rings.slice(1)) if (anyShift(hole)) return false;
  return true;
}

function samplePoints(): LngLat[] {
  const pts: LngLat[] = [];
  for (let lat = -87.5; lat <= 87.5; lat += 5) for (let lon = -177.5; lon <= 177.5; lon += 5) pts.push([lon, lat]);
  return pts;
}

describe('haversine', () => {
  it('Phoenix→Denver ≈ 942 km', () => expect(haversineKm(PHX, DEN)).toBeCloseTo(942, -1));
  it('London→Sydney ≈ 16,990 km', () => expect(haversineKm(LHR, SYD) / 1000).toBeCloseTo(16.99, 1));
  it('zero for same point', () => expect(haversineKm(PHX, PHX)).toBe(0));
});

describe('destinationPoint', () => {
  it('round-trips with haversine', () => {
    for (const b of [0, 45, 90, 135, 180, 270, 359]) {
      const p = destinationPoint(PHX, 1234, b);
      expect(haversineKm(PHX, p)).toBeCloseTo(1234, 3);
    }
  });
  it('going north 1° of arc raises latitude by 1°', () => {
    const p = destinationPoint([10, 10], (Math.PI / 180) * 6371.0088, 0);
    expect(p[1]).toBeCloseTo(11, 6);
    expect(p[0]).toBeCloseTo(10, 6);
  });
});

describe('normalizeLon / unwrap', () => {
  it('wraps', () => { expect(normalizeLon(190)).toBe(-170); expect(normalizeLon(-190)).toBe(170); expect(normalizeLon(180)).toBe(-180); });
  it('unwraps across the antimeridian', () => {
    expect(unwrapLongitudes([[170, 0], [-170, 0], [-150, 0]])).toEqual([[170, 0], [190, 0], [210, 0]]);
  });
});

describe('greatCirclePoints', () => {
  it('ends at the endpoints and stays continuous across the antimeridian', () => {
    const pts = greatCirclePoints([170, 30], [-170, 35], 16);
    expect(pts[0][1]).toBeCloseTo(30, 6);
    expect(pts[pts.length - 1][1]).toBeCloseTo(35, 6);
    for (let i = 1; i < pts.length; i++) expect(Math.abs(pts[i][0] - pts[i - 1][0])).toBeLessThan(10);
  });
});

describe('geodesicCircleRings', () => {
  const cases: Array<[string, LngLat, number]> = [
    ['small circle', PHX, 500],
    ['continental', PHX, 3000],
    ['crosses antimeridian', [175, -20], 1500],
    ['contains north pole', [10, 70], 3000],
    ['contains south pole', SYD, 7000],
    ['quarter globe (10,000 km)', PHX, 10000],
    ['A380 from Phoenix (14,800 km)', PHX, 14800],
    ['contains both poles from the equator', [0, 0], 12000],
    ['777-200LR from Auckland', [174.76, -36.85], 15840],
    ['almost everything', [0, 0], 19500],
  ];
  for (const [name, c, r] of cases) {
    it(`${name}: membership matches haversine on a global grid`, () => {
      const rings = geodesicCircleRings(c, r, 360);
      let mismatches = 0, total = 0;
      for (const p of samplePoints()) {
        const d = haversineKm(c, p);
        if (Math.abs(d - r) < r * 0.02 + 30) continue; // skip points near the boundary
        total++;
        if (inRings(rings, p) !== d < r) mismatches++;
      }
      expect(total).toBeGreaterThan(1000);
      expect(mismatches).toBe(0);
    });
  }
  it('keeps longitudes within what the MapLibre globe renders correctly (±360)', () => {
    for (const [, c, r] of cases) for (const ring of geodesicCircleRings(c, r)) for (const [lon] of ring) expect(Math.abs(lon)).toBeLessThanOrEqual(360);
    for (const c of [[-21.58, 24.08], [69, 0], [-69, 0], [179, 45], [-179, -45], [0, 0]] as LngLat[]) for (const r of [500, 9000, 12000, 14800, 16500]) {
      const g = geodesicAnnulus(c, r, r * 0.4, 90);
      const rings = g.type === 'Polygon' ? g.coordinates as LngLat[][] : (g.coordinates as LngLat[][][]).flat();
      for (const ring of rings) for (const [lon] of ring) expect(Math.abs(lon)).toBeLessThanOrEqual(360);
    }
  });
  it('outer ring is counter-clockwise, holes clockwise', () => {
    const rings = geodesicCircleRings(PHX, 14800);
    expect(rings.length).toBe(2);
    const area = (ring: LngLat[]) => { let s = 0; for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]; return s; };
    expect(area(rings[0])).toBeGreaterThan(0);
    expect(area(rings[1])).toBeLessThan(0);
  });
  it('antipode', () => { expect(antipode([10, 20])).toEqual([-170, -20]); });
});

// Planar point-in-ring (no ±360 retries) — what geojson-vt/earcut actually see.
function inRingPlanar(ring: LngLat[], [x, y]: LngLat): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

describe('geodesicAnnulus', () => {
  const bands: Array<[LngLat, number, number]> = [[PHX, 1000, 500], [[175, -20], 3000, 1500], [PHX, 14800, 13890], [[10, 70], 12000, 3000], [PHX, 16000, 10500], [PHX, 13890, 2360], [PHX, 14815, 9000], [SYD, 7000, 2000], [[0, 0], 12000, 3000], [[-179.5, 10], 14000, 700], [[120, -75], 9000, 1200]];
  for (const [c, outer, inner] of bands) {
    it(`band ${inner}–${outer} km around ${c.join(',')}: every hole sits inside its outer ring in one frame`, () => {
      const g = geodesicAnnulus(c, outer, inner, 120);
      const rings = g.type === 'Polygon' ? g.coordinates as LngLat[][] : (g.coordinates as LngLat[][][]).flat();
      const outerRing = rings[0];
      const lons = outerRing.map(p => p[0]), minLon = Math.min(...lons), maxLon = Math.max(...lons);
      const onBoundary = ([lon, lat]: LngLat) => Math.abs(lon - minLon) < 1e-6 || Math.abs(lon - maxLon) < 1e-6 || Math.abs(Math.abs(lat) - 90) < 1e-6;
      for (const hole of rings.slice(1)) {
        expect(Math.min(...hole.map(p => p[0]))).toBeGreaterThanOrEqual(minLon - 1e-6);
        expect(Math.max(...hole.map(p => p[0]))).toBeLessThanOrEqual(maxLon + 1e-6);
        for (const v of hole) if (!onBoundary(v)) expect(inRingPlanar(outerRing, v)).toBe(true);
      }
    });
    it(`band ${inner}–${outer} km around ${c.join(',')}: triangulation never covers the inner disc`, () => {
      // Triangulate like MapLibre's fill bucket (earcut with holes) and check the inner region stays unpainted.
      const g = geodesicAnnulus(c, outer, inner, 120);
      const rings = g.type === 'Polygon' ? g.coordinates as LngLat[][] : (g.coordinates as LngLat[][][]).flat();
      const flat: number[] = [], holeIdx: number[] = [];
      for (const ring of rings) { if (flat.length) holeIdx.push(flat.length / 2); for (const [x, y] of ring) flat.push(x, y); }
      const tri = earcut(flat, holeIdx, 2);
      const outerLons = rings[0].map(p => p[0]), minLon = Math.min(...outerLons), maxLon = Math.max(...outerLons);
      const covered = ([px, py]: LngLat) => {
        for (let i = 0; i < tri.length; i += 3) {
          const ax = flat[tri[i] * 2], ay = flat[tri[i] * 2 + 1], bx = flat[tri[i + 1] * 2], by = flat[tri[i + 1] * 2 + 1], cx = flat[tri[i + 2] * 2], cy = flat[tri[i + 2] * 2 + 1];
          const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by), d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy), d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
          if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true;
        }
        return false;
      };
      let bad = 0, total = 0;
      const inside: LngLat[] = [];
      for (let f = 0.1; f < 0.9; f += 0.15) for (let b = 0; b < 360; b += 30) inside.push(destinationPoint(c, inner * f, b));
      for (const p of inside) {
        if (Math.abs(p[1]) > 85) continue; // Mercator clamps beyond this anyway
        total++;
        // test the point in every world copy the polygon might occupy
        const shifts = [-720, -360, 0, 360, 720].map(k => [p[0] + k, p[1]] as LngLat).filter(q => q[0] >= minLon - 1 && q[0] <= maxLon + 1);
        if (shifts.some(covered)) bad++;
      }
      expect(total).toBeGreaterThan(20);
      expect(bad).toBe(0);
    });
  }
  for (const [c, outer, inner] of bands) {
    it(`band ${inner}–${outer} km around ${c.join(',')} matches haversine`, () => {
      const g = geodesicAnnulus(c, outer, inner, 360);
      const rings = g.type === 'Polygon' ? g.coordinates as LngLat[][] : (g.coordinates as LngLat[][][]).flat();
      let mismatches = 0, total = 0;
      for (const p of samplePoints()) {
        const d = haversineKm(c, p);
        if (Math.abs(d - outer) < outer * 0.02 + 30 || Math.abs(d - inner) < inner * 0.02 + 30) continue;
        total++;
        if (inRings(rings, p) !== (d < outer && d >= inner)) mismatches++;
      }
      expect(total).toBeGreaterThan(1000);
      expect(mismatches).toBe(0);
    });
  }
});

describe('geodesicCircleOutline', () => {
  it('every outline point is at the radius', () => {
    for (const [c, r] of [[PHX, 500], [PHX, 10000], [PHX, 14800], [[175, -20], 1500], [[10, 70], 3000]] as Array<[LngLat, number]>) {
      const pts = geodesicCircleOutline(c, r, 90);
      expect(pts.length).toBeGreaterThan(80);
      for (const p of pts) expect(haversineKm(c, [normalizeLon(p[0]), p[1]])).toBeCloseTo(r, 0);
      for (let i = 1; i < pts.length; i++) expect(Math.abs(pts[i][0] - pts[i - 1][0])).toBeLessThan(180);
    }
  });
  it('is empty for a whole-globe radius', () => expect(geodesicCircleOutline(PHX, 20015)).toEqual([]));
});
