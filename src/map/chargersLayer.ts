/**
 * Charging-station overlay data. Stations come from OpenStreetMap via our
 * /api/chargers proxy (CDN-cached 0.5° cells) — or straight from Overpass in
 * dev, where there is no serverless function.
 *
 * Discipline: fetch only at city zoom (≥8), never more than a screenful of
 * cells, cache each cell for the session, and merge everything we have into
 * one FeatureCollection for the clustered source.
 */
import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';

export const CHARGERS_MIN_ZOOM = 8;
const CELL = 0.5;
const MAX_CELLS = 12;

type Feature = GeoJSON.Feature<GeoJSON.Point, { name: string; operator: string | null }>;
const cellCache = new Map<string, Promise<Feature[]>>();

async function fetchCell(key: string): Promise<Feature[]> {
  if (import.meta.env.DEV) {
    const [lonIdx, latIdx] = key.split('_').map(Number);
    const w = lonIdx * CELL, s = latIdx * CELL;
    const q = `[out:json][timeout:10];node["amenity"="charging_station"](${s},${w},${s + CELL},${w + CELL});out 400;`;
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(q),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error(`Overpass ${r.status}`);
    const data = (await r.json()) as { elements: { id: number; lat: number; lon: number; tags?: Record<string, string> }[] };
    return data.elements.map(el => ({
      type: 'Feature',
      id: el.id,
      geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
      properties: { name: el.tags?.name ?? el.tags?.operator ?? 'Charging station', operator: el.tags?.operator ?? null },
    }));
  }
  // Relative on purpose: resolves under /compare-range/ on evlineup and / on the vercel.app domain.
  const r = await fetch(`api/chargers?cell=${key}`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`chargers api ${r.status}`);
  const data = (await r.json()) as { features: Feature[] };
  return data.features;
}

function visibleCells(map: MapLibreMap): string[] {
  const b = map.getBounds();
  const keys: string[] = [];
  const latLo = Math.floor(Math.max(-85, b.getSouth()) / CELL);
  const latHi = Math.floor(Math.min(85, b.getNorth()) / CELL);
  const lonLo = Math.floor(b.getWest() / CELL);
  const lonHi = Math.floor(b.getEast() / CELL);
  for (let la = latLo; la <= latHi; la++) {
    for (let lo = lonLo; lo <= lonHi; lo++) {
      // Wrap into [-180, 180) so panning across the antimeridian reuses the same cells.
      const wrapped = ((((lo * CELL + 180) % 360) + 360) % 360) - 180;
      keys.push(`${Math.round(wrapped / CELL)}_${la}`);
      if (keys.length > MAX_CELLS) return []; // too zoomed out to bother
    }
  }
  return keys;
}

/** Fetch any unseen cells in view and push everything we have into the source. */
export async function updateChargers(map: MapLibreMap, enabled: boolean): Promise<void> {
  const src = map.getSource('cr-chargers') as GeoJSONSource | undefined;
  if (!src) return;
  if (!enabled) { src.setData({ type: 'FeatureCollection', features: [] }); return; }
  if (map.getZoom() >= CHARGERS_MIN_ZOOM) {
    for (const key of visibleCells(map)) {
      if (!cellCache.has(key)) {
        const p = fetchCell(key);
        cellCache.set(key, p);
        p.catch(() => cellCache.delete(key)); // failed cells retry on the next pan
      }
    }
  }
  const all: Feature[] = [];
  for (const p of cellCache.values()) {
    const features = await p.catch(() => [] as Feature[]);
    all.push(...features);
  }
  // The map may have been torn down while we awaited.
  if (map.getSource('cr-chargers')) src.setData({ type: 'FeatureCollection', features: all });
}
