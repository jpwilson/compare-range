/**
 * Place search + reverse lookup via Photon (komoot) — open data, no API key.
 * https://photon.komoot.io — please keep request rates modest (we debounce and cache).
 *
 * The public Photon instance rate-limits and sometimes stalls requests outright,
 * so every call gets a hard timeout plus one retry, and explicit (Enter-key)
 * searches fall back to Nominatim — allowed for one-shot queries with attribution,
 * but never for keystroke autocomplete: https://operations.osmfoundation.org/policies/nominatim/
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
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const TIMEOUT_MS = 6000;
const cache = new Map<string, Place[]>();

/** Caller's signal plus a hard timeout, so a stalled geocoder request can't hang forever. */
function withTimeout(signal?: AbortSignal): AbortSignal | undefined {
  const timeout = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
  if (!timeout) return signal;
  if (!signal) return timeout;
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal;
}

async function getJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal: withTimeout(signal) });
  if (!res.ok) throw new Error(`Geocoder error ${res.status}`);
  return (await res.json()) as T;
}

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
  let data: { features: PhotonFeature[] };
  try {
    data = await getJson(url, opts.signal);
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    data = await getJson(url, opts.signal); // one retry — the public instance drops requests under load
  }
  const places = data.features.map(toPlace);
  cache.set(key, places);
  return places;
}

interface NominatimItem { display_name: string; lat: string; lon: string }

/**
 * Explicit search with a Nominatim fallback. Only call on a deliberate user action
 * (Enter / search button), never per keystroke.
 */
export async function searchPlacesHard(query: string, opts: { signal?: AbortSignal; near?: LngLat } = {}): Promise<Place[]> {
  try {
    const r = await searchPlaces(query, opts);
    if (r.length) return r;
  } catch (e) {
    if (opts.signal?.aborted) throw e;
  }
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query.trim());
  url.searchParams.set('limit', '6');
  const items = await getJson<NominatimItem[]>(url, opts.signal);
  return items.map(it => {
    const parts = it.display_name.split(', ');
    const detail = Array.from(new Set([...parts.slice(1, 3), parts[parts.length - 1]].filter(p => p && p !== parts[0]))).join(', ');
    return { name: parts[0], detail, lngLat: [Number(it.lon), Number(it.lat)] as LngLat };
  });
}

export async function reverseGeocode(lngLat: LngLat, signal?: AbortSignal): Promise<string> {
  const url = new URL(`${PHOTON}/reverse`);
  url.searchParams.set('lon', lngLat[0].toFixed(5));
  url.searchParams.set('lat', lngLat[1].toFixed(5));
  url.searchParams.set('lang', 'en');
  try {
    const data = await getJson<{ features: PhotonFeature[] }>(url, signal);
    const f = data.features[0];
    if (!f) return formatLngLat(lngLat);
    const p = f.properties;
    const locality = p.city || p.town || p.village || p.name;
    const parts = [locality, p.state, p.country].filter(Boolean);
    return Array.from(new Set(parts)).join(', ') || formatLngLat(lngLat);
  } catch (e) {
    if ((e as Error).name === 'AbortError' && signal?.aborted) throw e;
    return reverseGeocodeFallback(lngLat, signal);
  }
}

async function reverseGeocodeFallback(lngLat: LngLat, signal?: AbortSignal): Promise<string> {
  try {
    const url = new URL(`${NOMINATIM}/reverse`);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lon', lngLat[0].toFixed(5));
    url.searchParams.set('lat', lngLat[1].toFixed(5));
    url.searchParams.set('zoom', '10');
    const data = await getJson<{ address?: Record<string, string> }>(url, signal);
    const a = data.address ?? {};
    const parts = [a.city || a.town || a.village || a.county, a.state, a.country].filter(Boolean);
    return Array.from(new Set(parts)).join(', ') || formatLngLat(lngLat);
  } catch (e) {
    if ((e as Error).name === 'AbortError' && signal?.aborted) throw e;
    return formatLngLat(lngLat);
  }
}

export function formatLngLat([lon, lat]: LngLat): string {
  const ns = lat >= 0 ? 'N' : 'S', ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}
