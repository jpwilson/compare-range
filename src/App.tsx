import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES } from './data/categories';
import { QUICK_PICKS, VEHICLES, VEHICLE_BY_ID } from './data/vehicles';
import { formatDistance, haversineKm, type LngLat } from './geo/geodesy';
import { formatLngLat, reverseGeocode, type Place } from './geo/geocode';
import { MapView, type MapStyleId } from './map/MapView';
import { estimateTrip, formatDuration } from './model/trip';
import type { RingSpec } from './map/rangeLayers';
import { useAppState } from './state/useAppState';
import type { Units } from './state/urlState';
import { Chevron, Fit, Globe, Layers, Logo, Minus, Plus, Share, Swap, X } from './ui/icons';
import { PlaceSearch } from './ui/PlaceSearch';
import { Ranking } from './ui/Ranking';
import { TripResults } from './ui/TripResults';
import { VehicleList } from './ui/VehicleList';

const UNITS: Units[] = ['km', 'mi', 'nmi'];
const UNIT_NAMES: Record<Units, string> = { km: 'km', mi: 'mi', nmi: 'nm' };

function useIsMobile() {
  const [m, setM] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

/** 0→1 ease-out that restarts whenever `key` changes — drives the ring "grow" animation. */
function useReveal(key: string): number {
  const [anim, setAnim] = useState({ key, t: 1 });
  const first = useRef(true);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setAnim({ key, t: 1 }); return; }
    const start = performance.now(), dur = first.current ? 1100 : 650;
    first.current = false;
    let raf = 0;
    const tick = (now: number) => {
      const x = Math.min(1, (now - start) / dur);
      setAnim({ key, t: 1 - Math.pow(1 - x, 3) });
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key]);
  // On the render where the key changes, start from 0 instead of flashing the previous (finished) value.
  return anim.key === key ? anim.t : 0;
}

function useViewportHeight(): number {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const on = () => setH(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

/** Reverse-geocode a point into a label, cancelling stale lookups. */
function useLabel(point: LngLat | null, current: string, set: (label: string) => void) {
  useEffect(() => {
    // A label equal to the coordinate placeholder means "not resolved yet" (e.g. after a swap mid-lookup).
    if (!point || (current && current !== formatLngLat(point))) return;
    const ctrl = new AbortController();
    set(formatLngLat(point));
    reverseGeocode(point, ctrl.signal).then(l => { if (!ctrl.signal.aborted) set(l); }).catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point]);
}

export function App() {
  const { state, dispatch, selectedSet, toggle } = useAppState();
  const isMobile = useIsMobile();
  const viewportH = useViewportHeight();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [styleId, setStyleId] = useState<MapStyleId>('dark');
  const reveal = useReveal(`${state.origin?.join(',')}|${state.selected.join(',')}`);
  const [fitRequest, setFitRequest] = useState(1);
  const [toast, setToast] = useState<string | null>('Click anywhere on the map to move the pin — or drag it.');
  const mapZoom = useRef<{ zoomIn: () => void; zoomOut: () => void } | null>(null);

  useLabel(state.origin, state.originLabel, l => dispatch({ type: 'setOriginLabel', label: l }));
  useLabel(state.destination, state.destinationLabel, l => dispatch({ type: 'setDestinationLabel', label: l }));

  const selectedVehicles = useMemo(() => state.selected.map(id => VEHICLE_BY_ID.get(id)!).filter(Boolean), [state.selected]);
  const fullRings: RingSpec[] = useMemo(() => selectedVehicles.map(v => ({ id: v.id, name: v.name, color: CATEGORIES[v.category].color, rangeKm: v.rangeKm, label: `${v.name} · ${formatDistance(v.rangeKm, state.units)}` })), [selectedVehicles, state.units]);
  const rings: RingSpec[] = useMemo(() => (reveal >= 1 ? fullRings : fullRings.map(r => ({ ...r, rangeKm: Math.max(1, r.rangeKm * (0.15 + 0.85 * reveal)) }))), [fullRings, reveal]);
  const longest = selectedVehicles.reduce<typeof selectedVehicles[number] | null>((m, v) => (!m || v.rangeKm > m.rangeKm ? v : m), null);
  const tripKm = state.mode === 'trip' && state.origin && state.destination ? haversineKm(state.origin, state.destination) : null;
  const fastestTrip = useMemo(() => {
    if (tripKm === null || selectedVehicles.length === 0) return null;
    return selectedVehicles.map(v => ({ v, e: estimateTrip(v, tripKm) })).sort((a, b) => a.e.totalMin - b.e.totalMin)[0];
  }, [tripKm, selectedVehicles]);

  const padding = useMemo(() => (isMobile ? { top: 140, left: 24, right: 24, bottom: Math.min(viewportH * 0.46 + 24, viewportH - 200) } : { top: 40, left: 440, right: 60, bottom: 40 }), [isMobile, viewportH]);
  const fit = useCallback(() => setFitRequest(n => n + 1), []);

  const onMapClick = useCallback((lngLat: LngLat) => {
    setToast(null);
    if (state.mode === 'trip') dispatch({ type: 'setDestination', lngLat });
    else dispatch({ type: 'setOrigin', lngLat });
  }, [state.mode, dispatch]);

  const pickOrigin = (pl: Place) => { dispatch({ type: 'setOrigin', lngLat: pl.lngLat, label: [pl.name, pl.detail].filter(Boolean).join(', ') }); setToast(null); fit(); };
  const pickDestination = (pl: Place) => { dispatch({ type: 'setDestination', lngLat: pl.lngLat, label: [pl.name, pl.detail].filter(Boolean).join(', ') }); fit(); };
  const setMany = (ids: string[], on: boolean) => { dispatch({ type: 'setSelected', ids: on ? Array.from(new Set([...state.selected, ...ids])) : state.selected.filter(id => !ids.includes(id)) }); if (on) fit(); };
  // Adding a vehicle re-frames the map around its ring; removing one leaves the camera alone.
  const toggleAndFit = (id: string) => { const adding = !selectedSet.has(id); toggle(id); if (adding) { fit(); setToast(null); } };

  const share = async () => {
    const url = window.location.href;
    try {
      if (isMobile && navigator.share) { await navigator.share({ title: 'CompareRange', url }); return; }
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setToast('Link copied — it captures the pin, vehicles and units.'); return; }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user dismissed the share sheet
    }
    // No clipboard API (e.g. plain-HTTP deploy): fall back to a selectable prompt.
    window.prompt('Copy this link:', url);
  };

  const modeSeg = (
    <div className="seg" role="group" aria-label="Mode">
      <button aria-pressed={state.mode === 'rings'} onClick={() => { dispatch({ type: 'setMode', mode: 'rings' }); }}>Range rings</button>
      <button aria-pressed={state.mode === 'trip'} onClick={() => { dispatch({ type: 'setMode', mode: 'trip' }); if (!state.destination) setToast('Now click the map (or search) to set where you want to go.'); }}>Can it get there?</button>
    </div>
  );

  return (
    <div className="app">
      <MapView
        origin={state.origin}
        destination={state.destination}
        rings={state.mode === 'trip' ? [] : rings}
        fitRings={state.mode === 'trip' ? [] : fullRings}
        showTrip={state.mode === 'trip'}
        projection={state.projection}
        styleId={styleId}
        picking={state.mode === 'trip' && !state.destination}
        padding={padding}
        fitRequest={fitRequest}
        onMapClick={onMapClick}
        onOriginMove={l => dispatch({ type: 'setOrigin', lngLat: l })}
        onDestinationMove={l => dispatch({ type: 'setDestination', lngLat: l })}
        onReady={map => { mapZoom.current = { zoomIn: () => map.zoomIn(), zoomOut: () => map.zoomOut() }; }}
      />

      <div className="topbar">
        <span className="wordmark"><Logo size={22} /><span className="wordmark__text">Compare<b>Range</b></span></span>
        <span style={{ flex: 1 }} />
        <button className="linkbtn" onClick={share} aria-label="Share link"><Share /></button>
      </div>

      <div className="toolbar">
        <div className="units" role="group" aria-label="Units">
          {UNITS.map(u => <button key={u} aria-pressed={state.units === u} onClick={() => dispatch({ type: 'setUnits', units: u })}>{UNIT_NAMES[u]}</button>)}
        </div>
        <span className="toolbar__sep" />
        <button className="rbtn" aria-pressed={state.projection === 'globe'} onClick={() => dispatch({ type: 'setProjection', projection: state.projection === 'globe' ? 'mercator' : 'globe' })} aria-label="Toggle globe" title={state.projection === 'globe' ? 'Switch to flat map' : 'Switch to globe'}><Globe /></button>
        <button className="rbtn" onClick={fit} aria-label="Fit rings in view" title="Fit everything in view"><Fit /></button>
        <button className="rbtn" aria-pressed={styleId === 'liberty'} onClick={() => setStyleId(s => (s === 'dark' ? 'liberty' : 'dark'))} aria-label="Toggle detailed basemap" title={styleId === 'dark' ? 'Detailed map' : 'Dark map'}><Layers /></button>
      </div>
      <div className="zoomstack">
        <button className="rbtn" onClick={() => mapZoom.current?.zoomIn()} aria-label="Zoom in"><Plus /></button>
        <button className="rbtn" onClick={() => mapZoom.current?.zoomOut()} aria-label="Zoom out"><Minus /></button>
      </div>

      <aside className={`panel${sheetOpen ? ' is-expanded' : ''}`} aria-label="Controls">
        <button className="sheet-handle" onClick={() => setSheetOpen(o => !o)} aria-label={sheetOpen ? 'Collapse panel' : 'Expand panel'}><i /></button>
        <div className="panel__head">
          <div className="wordmark"><Logo size={24} /><span className="wordmark__text">CompareRange</span></div>
          <div className="tagline">How far can it go <em>from here?</em></div>
          {state.mode === 'rings' ? (
            <>
              <PlaceSearch value={state.originLabel} placeholder="Search a place…" icon="pin" near={state.origin} onPick={pickOrigin} />
              <div className="hint">Or click anywhere on the map to move the pin.</div>
            </>
          ) : (
            <div className="trip-fields">
              <PlaceSearch label="FROM" value={state.originLabel} placeholder="Start" near={state.origin} onPick={pickOrigin} />
              <PlaceSearch
                label="TO" value={state.destinationLabel} placeholder="Click the map or search…" near={state.origin} onPick={pickDestination}
                onClear={state.destination ? () => dispatch({ type: 'setDestination', lngLat: null }) : undefined}
                trailing={state.destination ? <button className="field__btn" onClick={() => dispatch({ type: 'swap' })} aria-label="Swap origin and destination"><Swap /></button> : null}
              />
            </div>
          )}
          {modeSeg}
        </div>

        <div className="panel__scroll">
          {state.mode === 'rings' ? (
            <>
              <div className="section-title">
                <h2>{state.view === 'rank' ? 'Ranked by range' : 'Vehicles'} <span>· {selectedSet.size} of {VEHICLES.length}</span></h2>
                <button className="linkbtn" onClick={() => dispatch({ type: 'setView', view: state.view === 'rank' ? 'list' : 'rank' })}>{state.view === 'rank' ? 'Back to list' : 'Rank'} <Chevron /></button>
              </div>
              {state.view === 'rank'
                ? <Ranking vehicles={selectedVehicles} units={state.units} />
                : <>
                  {selectedSet.size === 0 ? (
                    <div className="starter">
                      <p>Pick a vehicle and its range appears around the pin. Add more to compare them.</p>
                      <div className="starter__picks">
                        {QUICK_PICKS.map(id => VEHICLE_BY_ID.get(id)).filter(Boolean).map(v => (
                          <button key={v!.id} className="chip" onClick={() => toggleAndFit(v!.id)} style={{ ['--c' as string]: CATEGORIES[v!.category].color }}>{v!.name}</button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <VehicleList vehicles={VEHICLES} selected={selectedSet} units={state.units} onToggle={toggleAndFit} onSetMany={setMany} />
                </>}
            </>
          ) : tripKm !== null ? (
            <TripResults vehicles={selectedVehicles} distanceKm={tripKm} units={state.units} />
          ) : (
            <div className="empty">Pick a destination — click anywhere on the map, or search above. You'll see which of your {selectedSet.size} selected vehicles can make it non-stop.</div>
          )}
        </div>

        <div className="panel__foot">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="foot__label">{state.mode === 'trip' ? (fastestTrip ? 'Fastest door to door' : 'Comparing') : 'Longest range selected'}</div>
            {state.mode === 'trip' ? (
              fastestTrip ? (
                <div className="foot__value"><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fastestTrip.v.name}</b><span className="mono" style={{ fontSize: 13, color: CATEGORIES[fastestTrip.v.category].color }}>{formatDuration(fastestTrip.e.totalMin)}</span></div>
              ) : (
                <div className="foot__value"><b>{selectedSet.size}</b><span className="muted" style={{ fontSize: 12 }}>vehicles · pick them under Range rings</span></div>
              )
            ) : longest ? (
              <div className="foot__value"><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{longest.name}</b><span className="mono" style={{ fontSize: 13, color: CATEGORIES[longest.category].color }}>{formatDistance(longest.rangeKm, state.units)}</span></div>
            ) : (
              <div className="foot__value"><b>Nothing yet</b><span className="muted" style={{ fontSize: 12 }}>pick a vehicle above</span></div>
            )}
          </div>
          <button className="btn" onClick={share}><Share /> Share</button>
        </div>
      </aside>

      {toast ? (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss"><X /></button>
        </div>
      ) : null}
    </div>
  );
}
