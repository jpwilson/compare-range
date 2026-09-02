/**
 * Charging-station tiles, proxied from Overpass (OpenStreetMap) so Vercel's CDN
 * absorbs repeat traffic instead of the volunteer-run Overpass servers.
 *
 * GET /api/chargers?cell=<lonIdx>_<latIdx> — one 0.5°×0.5° cell, indices are
 * floor(lon/0.5) / floor(lat/0.5). The deterministic URL space makes every cell
 * a long-lived CDN entry (s-maxage 7 days).
 */

interface Req { query: Record<string, string | string[] | undefined> }
interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

interface OverpassNode { type: string; id: number; lat: number; lon: number; tags?: Record<string, string> }

export default async function handler(req: Req, res: Res) {
  const cell = String(req.query.cell ?? '');
  const m = /^(-?\d{1,3})_(-?\d{1,3})$/.exec(cell);
  if (!m) { res.status(400).json({ error: 'cell must be "<lonIdx>_<latIdx>" at 0.5 degree resolution' }); return; }
  const lonIdx = Number(m[1]), latIdx = Number(m[2]);
  if (lonIdx < -360 || lonIdx >= 360 || latIdx < -170 || latIdx >= 170) {
    res.status(400).json({ error: 'cell out of range' });
    return;
  }
  const w = lonIdx * 0.5, s = latIdx * 0.5;
  const query = `[out:json][timeout:10];node["amenity"="charging_station"](${s},${w},${s + 0.5},${w + 0.5});out 400;`;

  let data: { elements: OverpassNode[] } | null = null;
  let lastErr = '';
  for (const endpoint of ENDPOINTS) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) { lastErr = `Overpass ${r.status}`; continue; }
      data = (await r.json()) as { elements: OverpassNode[] };
      break;
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  if (!data) { res.status(502).json({ error: `Overpass unavailable: ${lastErr}` }); return; }

  const features = data.elements
    .filter(el => Number.isFinite(el.lat) && Number.isFinite(el.lon))
    .map(el => ({
      type: 'Feature' as const,
      id: el.id,
      geometry: { type: 'Point' as const, coordinates: [el.lon, el.lat] },
      properties: {
        name: el.tags?.name ?? el.tags?.operator ?? 'Charging station',
        operator: el.tags?.operator ?? null,
      },
    }));

  res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ type: 'FeatureCollection', features, attribution: '© OpenStreetMap contributors' });
}
