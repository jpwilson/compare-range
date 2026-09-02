import { Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource, type LngLatBoundsLike, type MapMouseEvent, type PaddingOptions } from 'maplibre-gl';

// Production builds ship the worker as a static file (see vite.config.ts); in dev Vite serves the package unbundled.
if (import.meta.env.PROD) setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/${__MAPLIBRE_VERSION__}/maplibre-gl-worker.mjs`);
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { LngLat } from '../geo/geodesy';
import type { Projection } from '../state/urlState';
import { buildBands, buildOutlines, buildTrip, EMPTY, ringBounds, type RingSpec } from './rangeLayers';
import { updateChargers } from './chargersLayer';

export const MAP_STYLES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
} as const;
export type MapStyleId = keyof typeof MAP_STYLES;

export interface MapViewProps {
  origin: LngLat | null;
  destination: LngLat | null;
  rings: RingSpec[];
  /** Unscaled rings (the reveal animation shrinks `rings`); used for fitting. */
  fitRings: RingSpec[];
  showTrip: boolean;
  projection: Projection;
  styleId: MapStyleId;
  picking: boolean;
  showChargers: boolean;
  padding: PaddingOptions;
  /** Bump to ask the map to fit the current rings / trip. */
  fitRequest: number;
  onMapClick: (lngLat: LngLat) => void;
  onOriginMove: (lngLat: LngLat) => void;
  onDestinationMove: (lngLat: LngLat) => void;
  onReady?: (map: MapLibreMap) => void;
}

const SRC = { bands: 'cr-bands', outlines: 'cr-outlines', trip: 'cr-trip' } as const;
const BG = '#07090f';
const INK = '#f3f5f9';
const DEST = '#ff6b9d';

function pinElement(color: string, label: string, pulse = false): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'pin-wrap';
  el.style.width = '28px';
  el.style.height = '36px';
  el.innerHTML =
    (pulse ? `<div class="pulse" style="background:${color}"></div>` : '') +
    `<svg class="pin" viewBox="0 0 28 36" aria-label="${label || 'Pin'}"><path d="M14 35 C14 35 3 21 3 13 A11 11 0 0 1 25 13 C25 21 14 35 14 35 Z" fill="${color}" stroke="${BG}" stroke-width="2"></path><circle cx="14" cy="13" r="4.5" fill="${BG}"></circle></svg>` +
    (label ? `<div class="pin-label">${label}</div>` : '');
  return el;
}

/** Give OpenFreeMap's greyscale dark style a deep navy water tone (no-op on other styles). */
function tintDarkStyle(map: MapLibreMap) {
  if (!map.getLayer('water') || !map.getLayer('background')) return;
  const bg = map.getPaintProperty('background', 'background-color');
  if (bg !== 'rgb(12,12,12)') return;
  map.setPaintProperty('background', 'background-color', '#0a0d15');
  map.setPaintProperty('water', 'fill-color', '#0c1526');
  if (map.getLayer('waterway')) map.setPaintProperty('waterway', 'line-color', '#132345');
}

/**
 * Zoom at which the whole globe fits inside the padded viewport. MapLibre draws the globe with pixel radius
 * 512·2^z / 2π / cos(centerLat), so the target radius is scaled by cos(centerLat).
 */
function globeFitZoom(map: MapLibreMap, pad: PaddingOptions, centerLat: number): number {
  const el = map.getContainer();
  const w = el.clientWidth - (pad.left ?? 0) - (pad.right ?? 0);
  const h = el.clientHeight - (pad.top ?? 0) - (pad.bottom ?? 0);
  const radius = (Math.max(120, Math.min(w, h)) / 2) * 0.92 * Math.max(0.2, Math.cos((centerLat * Math.PI) / 180));
  return Math.max(0, Math.log2((radius * 2 * Math.PI) / 512));
}

function addLayers(map: MapLibreMap) {
  const style = map.getStyle();
  const firstSymbol = style.layers.find(l => l.type === 'symbol')?.id;
  const addSource = (id: string) => { if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: EMPTY, tolerance: 0.2 }); };
  addSource(SRC.bands); addSource(SRC.outlines); addSource(SRC.trip);
  if (!map.getLayer('cr-bands-fill')) map.addLayer({ id: 'cr-bands-fill', type: 'fill', source: SRC.bands, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.16, 'fill-antialias': false } }, firstSymbol);
  if (!map.getLayer('cr-outline-glow')) map.addLayer({ id: 'cr-outline-glow', type: 'line', source: SRC.outlines, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 12, 'line-blur': 10, 'line-opacity': 0.45 } }, firstSymbol);
  if (!map.getLayer('cr-outline-line')) map.addLayer({ id: 'cr-outline-line', type: 'line', source: SRC.outlines, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 1 } }, firstSymbol);
  if (!map.getLayer('cr-trip-glow')) map.addLayer({ id: 'cr-trip-glow', type: 'line', source: SRC.trip, layout: { 'line-cap': 'round' }, paint: { 'line-color': INK, 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.35 } });
  if (!map.getLayer('cr-trip-line')) map.addLayer({ id: 'cr-trip-line', type: 'line', source: SRC.trip, layout: { 'line-cap': 'round' }, paint: { 'line-color': INK, 'line-width': 2.5, 'line-dasharray': [2, 1.6] } });
  if (!map.getLayer('cr-outline-label')) map.addLayer({
    id: 'cr-outline-label', type: 'symbol', source: SRC.outlines,
    layout: { 'symbol-placement': 'line', 'symbol-spacing': 700, 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-letter-spacing': 0.02, 'text-max-angle': 20, 'text-pitch-alignment': 'viewport', 'text-padding': 6 },
    paint: { 'text-color': ['get', 'color'], 'text-halo-color': BG, 'text-halo-width': 2, 'text-halo-blur': 0.6 },
  });
  if (!map.getSource('cr-chargers')) map.addSource('cr-chargers', { type: 'geojson', data: EMPTY, cluster: true, clusterRadius: 42, clusterMaxZoom: 14 });
  if (!map.getLayer('cr-chargers-cluster')) map.addLayer({ id: 'cr-chargers-cluster', type: 'circle', source: 'cr-chargers', filter: ['has', 'point_count'], paint: { 'circle-color': '#3ddc84', 'circle-opacity': 0.85, 'circle-radius': ['step', ['get', 'point_count'], 11, 25, 15, 100, 19], 'circle-stroke-color': BG, 'circle-stroke-width': 1.5 } });
  if (!map.getLayer('cr-chargers-count')) map.addLayer({ id: 'cr-chargers-count', type: 'symbol', source: 'cr-chargers', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 11 }, paint: { 'text-color': BG } });
  if (!map.getLayer('cr-chargers-dot')) map.addLayer({ id: 'cr-chargers-dot', type: 'circle', source: 'cr-chargers', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': '#3ddc84', 'circle-radius': 4.5, 'circle-stroke-color': BG, 'circle-stroke-width': 1.5 } });
}

export function MapView(p: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const originMarker = useRef<Marker | null>(null);
  const destMarker = useRef<Marker | null>(null);
  const sweepMarker = useRef<Marker | null>(null);
  const doneFit = useRef(0);
  const [styleReady, setStyleReady] = useState(0);
  const cb = useRef(p); cb.current = p;
  const styleIdRef = useRef(p.styleId);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLES[cb.current.styleId],
      center: cb.current.origin ?? [-30, 25],
      zoom: cb.current.origin ? 4 : 1.4,
      attributionControl: { compact: true },
      maxPitch: 0,
      fadeDuration: 100,
    });
    mapRef.current = map;
    if (import.meta.env.DEV) (window as unknown as { __map?: MapLibreMap }).__map = map;
    map.on('style.load', () => { tintDarkStyle(map); addLayers(map); setStyleReady(n => n + 1); });
    map.on('click', (e: MapMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement | null;
      if (target?.closest('.pin-wrap')) return;
      const l = e.lngLat.wrap();
      cb.current.onMapClick([l.lng, l.lat]);
    });
    map.once('load', () => cb.current.onReady?.(map));
    return () => { originMarker.current?.remove(); destMarker.current?.remove(); sweepMarker.current?.remove(); originMarker.current = null; destMarker.current = null; sweepMarker.current = null; map.remove(); mapRef.current = null; doneFit.current = 0; setStyleReady(0); };
  }, []);

  // Charging stations: refetch on toggle, style reload and (debounced) map moves.
  useEffect(() => {
    const map = mapRef.current; if (!map || !styleReady) return;
    void updateChargers(map, p.showChargers);
    if (!p.showChargers) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const onMove = () => { clearTimeout(t); t = setTimeout(() => void updateChargers(map, cb.current.showChargers), 500); };
    map.on('moveend', onMove);
    return () => { clearTimeout(t); map.off('moveend', onMove); };
  }, [p.showChargers, styleReady]);

  // Style switch (re-adds layers + projection on style.load).
  useEffect(() => {
    const map = mapRef.current; if (!map || styleIdRef.current === p.styleId) return;
    styleIdRef.current = p.styleId;
    map.setStyle(MAP_STYLES[p.styleId]);
  }, [p.styleId]);

  // Projection.
  useEffect(() => {
    const map = mapRef.current; if (!map || !styleReady) return;
    map.setProjection({ type: p.projection });
  }, [p.projection, styleReady]);

  // Data → sources.
  useEffect(() => {
    const map = mapRef.current; if (!map || !styleReady) return;
    const bands = map.getSource(SRC.bands) as GeoJSONSource | undefined;
    const outlines = map.getSource(SRC.outlines) as GeoJSONSource | undefined;
    if (!bands || !outlines) return;
    if (p.origin && p.rings.length) { bands.setData(buildBands(p.origin, p.rings)); outlines.setData(buildOutlines(p.origin, p.rings)); }
    else { bands.setData(EMPTY); outlines.setData(EMPTY); }
  }, [p.origin, p.rings, styleReady]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !styleReady) return;
    const trip = map.getSource(SRC.trip) as GeoJSONSource | undefined;
    trip?.setData(p.showTrip ? buildTrip(p.origin, p.destination) : EMPTY);
  }, [p.origin, p.destination, p.showTrip, styleReady]);

  // Markers.
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const sync = (ref: { current: Marker | null }, pos: LngLat | null, color: string, label: string, onMove: (l: LngLat) => void, pulse: boolean) => {
      if (!pos) { ref.current?.remove(); ref.current = null; return; }
      if (!ref.current) {
        const m = new Marker({ element: pinElement(color, label, pulse), anchor: 'bottom', draggable: true }).setLngLat(pos).addTo(map);
        m.on('dragend', () => { const l = m.getLngLat().wrap(); onMove([l.lng, l.lat]); });
        if (pulse) m.on('drag', () => sweepMarker.current?.setLngLat(m.getLngLat()));
        ref.current = m;
      } else {
        const cur = ref.current.getLngLat();
        if (Math.abs(cur.lng - pos[0]) > 1e-9 || Math.abs(cur.lat - pos[1]) > 1e-9) ref.current.setLngLat(pos);
      }
    };
    // Radar sweep under the origin pin (decorative, non-interactive).
    if (p.origin && !sweepMarker.current) {
      const wrap = document.createElement('div'); wrap.className = 'sweep-wrap';
      const el = document.createElement('div'); el.className = 'sweep'; wrap.appendChild(el);
      sweepMarker.current = new Marker({ element: wrap, anchor: 'center', className: 'sweep-marker' }).setLngLat(p.origin).addTo(map);
    } else if (p.origin && sweepMarker.current) sweepMarker.current.setLngLat(p.origin);
    else if (!p.origin) { sweepMarker.current?.remove(); sweepMarker.current = null; }
    sync(originMarker, p.origin, INK, p.showTrip ? 'From' : '', l => cb.current.onOriginMove(l), true);
    sync(destMarker, p.showTrip ? p.destination : null, DEST, 'To', l => cb.current.onDestinationMove(l), false);
  }, [p.origin, p.destination, p.showTrip]);

  // Relabel origin marker when mode changes (cheap: rebuild).
  useEffect(() => {
    if (!originMarker.current) return;
    const el = originMarker.current.getElement();
    const lbl = el.querySelector('.pin-label');
    if (p.showTrip && !lbl) { const d = document.createElement('div'); d.className = 'pin-label'; d.textContent = 'From'; el.appendChild(d); }
    if (!p.showTrip && lbl) lbl.remove();
  }, [p.showTrip]);

  // Fit.
  useEffect(() => {
    const map = mapRef.current; if (!map || !styleReady || !p.fitRequest || !p.origin) return;
    if (doneFit.current === p.fitRequest) return; // a style reload must not throw away the user's camera
    doneFit.current = p.fitRequest;
    const extra = p.showTrip && p.destination ? [p.destination] : [];
    if (!p.showTrip && p.fitRings.length === 0) {
      // Nothing to frame yet: a regional view around the pin, not a street-level zoom on it.
      map.flyTo({ center: p.origin, zoom: Math.min(4, Math.max(map.getZoom(), 2.5)), padding: p.padding, duration: 700 });
      return;
    }
    const b = ringBounds(p.origin, p.showTrip ? [] : p.fitRings, extra);
    if (!b) {
      map.flyTo({ center: p.origin, zoom: globeFitZoom(map, p.padding, p.origin[1]), padding: p.padding, duration: 900 });
    } else {
      const bounds: LngLatBoundsLike = b;
      map.fitBounds(bounds, { padding: p.padding, duration: 900, maxZoom: 12 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.fitRequest, styleReady]);

  return <div ref={containerRef} className={`map${p.picking ? ' is-picking' : ''}`} role="application" aria-label="Map" />;
}
