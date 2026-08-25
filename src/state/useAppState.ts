import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { DEFAULT_SELECTION, VEHICLE_BY_ID } from '../data/vehicles';
import type { LngLat } from '../geo/geodesy';
import { readUrlState, writeUrlState, type Mode, type Projection, type Units } from './urlState';

export const DEFAULT_ORIGIN: LngLat = [-112.074, 33.448]; // Phoenix, AZ
export type PanelView = 'list' | 'rank';

export interface AppState {
  origin: LngLat | null;
  originLabel: string;
  destination: LngLat | null;
  destinationLabel: string;
  selected: string[];
  units: Units;
  mode: Mode;
  projection: Projection;
  view: PanelView;
}

export type Action =
  | { type: 'setOrigin'; lngLat: LngLat; label?: string }
  | { type: 'setOriginLabel'; label: string }
  | { type: 'setDestination'; lngLat: LngLat | null; label?: string }
  | { type: 'setDestinationLabel'; label: string }
  | { type: 'swap' }
  | { type: 'toggleVehicle'; id: string }
  | { type: 'setSelected'; ids: string[] }
  | { type: 'setUnits'; units: Units }
  | { type: 'setMode'; mode: Mode }
  | { type: 'setProjection'; projection: Projection }
  | { type: 'setView'; view: PanelView };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'setOrigin': return { ...s, origin: a.lngLat, originLabel: a.label ?? '' };
    case 'setOriginLabel': return { ...s, originLabel: a.label };
    case 'setDestination': return { ...s, destination: a.lngLat, destinationLabel: a.label ?? '' };
    case 'setDestinationLabel': return { ...s, destinationLabel: a.label };
    case 'swap': return s.destination ? { ...s, origin: s.destination, originLabel: s.destinationLabel, destination: s.origin, destinationLabel: s.originLabel } : s;
    case 'toggleVehicle': return { ...s, selected: s.selected.includes(a.id) ? s.selected.filter(x => x !== a.id) : [...s.selected, a.id] };
    case 'setSelected': return { ...s, selected: a.ids };
    case 'setUnits': return { ...s, units: a.units };
    case 'setMode': return { ...s, mode: a.mode };
    case 'setProjection': return { ...s, projection: a.projection };
    case 'setView': return { ...s, view: a.view };
  }
}

function initial(): AppState {
  const u = readUrlState();
  const selected = (u.selected ?? DEFAULT_SELECTION).filter(id => VEHICLE_BY_ID.has(id));
  return {
    origin: u.origin ?? DEFAULT_ORIGIN,
    originLabel: '',
    destination: u.destination,
    destinationLabel: '',
    selected,
    units: u.units,
    mode: u.mode,
    projection: u.projection ?? 'globe',
    view: 'list',
  };
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, initial);

  // Keep the URL shareable.
  useEffect(() => {
    const t = setTimeout(() => writeUrlState({ origin: state.origin, destination: state.destination, selected: state.selected, units: state.units, mode: state.mode, projection: state.projection }), 150);
    return () => clearTimeout(t);
  }, [state.origin, state.destination, state.selected, state.units, state.mode, state.projection]);

  const selectedSet = useMemo(() => new Set(state.selected), [state.selected]);
  const toggle = useCallback((id: string) => dispatch({ type: 'toggleVehicle', id }), []);
  return { state, dispatch, selectedSet, toggle };
}
