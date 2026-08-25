/**
 * Shareable URL state, kept in the hash so the static host never sees it:
 *   #o=33.45,-112.07&d=39.74,-104.99&v=tesla-cybertruck,rivian-r1s&u=mi&m=trip&p=globe
 */
import type { LngLat } from '../geo/geodesy';

export type Units = 'km' | 'mi' | 'nmi';
export type Mode = 'rings' | 'trip';
export type Projection = 'mercator' | 'globe';

export interface UrlState {
  origin: LngLat | null;
  destination: LngLat | null;
  selected: string[] | null; // null = use defaults
  units: Units;
  mode: Mode;
  projection: Projection | null;
}

function parseLngLat(v: string | null): LngLat | null {
  if (!v) return null;
  const parts = v.split(',');
  if (parts.length !== 2 || parts.some(x => x.trim() === '')) return null; // Number('') === 0 would mean Null Island
  const [lat, lon] = parts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return [lon, lat];
}
const fmt = ([lon, lat]: LngLat) => `${lat.toFixed(4)},${lon.toFixed(4)}`;

export function readUrlState(hash = window.location.hash): UrlState {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const u = q.get('u'), m = q.get('m'), p = q.get('p');
  const v = q.get('v');
  return {
    origin: parseLngLat(q.get('o')),
    destination: parseLngLat(q.get('d')),
    selected: v === null ? null : v.split(',').filter(Boolean),
    units: u === 'mi' || u === 'nmi' ? u : 'km',
    mode: m === 'trip' ? 'trip' : 'rings',
    projection: p === 'globe' || p === 'mercator' ? p : null,
  };
}

export function writeUrlState(s: UrlState): void {
  const q = new URLSearchParams();
  if (s.origin) q.set('o', fmt(s.origin));
  if (s.destination) q.set('d', fmt(s.destination));
  if (s.selected && s.selected.length) q.set('v', s.selected.join(','));
  if (s.units !== 'km') q.set('u', s.units);
  if (s.mode !== 'rings') q.set('m', s.mode);
  if (s.projection) q.set('p', s.projection);
  const next = '#' + q.toString();
  if (next !== window.location.hash) history.replaceState(null, '', next === '#' ? window.location.pathname : next);
}
