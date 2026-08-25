/**
 * Place search + reverse lookup via Photon (komoot) — open data, no API key.
 * https://photon.komoot.io — please keep request rates modest (we debounce and cache).
 */
import type { LngLat } from './geodesy';

export interface Place {
  name: string;
  /** "City, Region, Country" style secondary line. */
  detail: string;
  lngLat: LngLat;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string; city?: string; town?: string; village?: string; state?: string; country?: string; countrycode?: string;
    osm_key?: string; osm_value?: string; type?: string; street?: string; housenumber?: string;
  };
}

const PHOTON = 'https://photon.komoot.io';
const cache = new Map<string, Place[]>();

function toPlace(f: PhotonFeature): Place {
  const p = f.properties;
  const name = p.name || p.street || p.city || p.country || 'Unnamed place';
  const parts = [p.city || p.town || p.village, p.state, p.country].filter(v => v && v !== name);
  return { name, detail: Array.from(new Set(parts)).join(', '), lngLat: [f.geometry.coordinates[0], f.geometry.coordinates[1]] };
}

export async function searchPlaces(query: string, opts: { signal?: AbortSignal; near?: LngLat; limit?: number } = {}): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const key = `${q}|${opts.near?.map(v => v.toFixed(1)).join(',') ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url = new URL(`${PHOTON}/api/`);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(opts.limit ?? 6));
  url.searchParams.set('lang', 'en');
  if (opts.near) { url.searchParams.set('lon', String(opts.near[0])); url.searchParams.set('lat', String(opts.near[1])); }
  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) throw new Error(`Geocoder error ${res.status}`);
  const data = (await res.json()) as { features: PhotonFeature[] };
  const places = data.features.map(toPlace);
  cache.set(key, places);
  return places;
}

export async function reverseGeocode(lngLat: LngLat, signal?: AbortSignal): Promise<string> {
  const url = new URL(`${PHOTON}/reverse`);
  url.searchParams.set('lon', lngLat[0].toFixed(5));
  url.searchParams.set('lat', lngLat[1].toFixed(5));
  url.searchParams.set('lang', 'en');
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return formatLngLat(lngLat);
    const data = (await res.json()) as { features: PhotonFeature[] };
    const f = data.features[0];
    if (!f) return formatLngLat(lngLat);
    const p = f.properties;
    const locality = p.city || p.town || p.village || p.name;
    const parts = [locality, p.state, p.country].filter(Boolean);
    return Array.from(new Set(parts)).join(', ') || formatLngLat(lngLat);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return formatLngLat(lngLat);
  }
}

export function formatLngLat([lon, lat]: LngLat): string {
  const ns = lat >= 0 ? 'N' : 'S', ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}
