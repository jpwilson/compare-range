import { useEffect, useId, useRef, useState } from 'react';
import type { LngLat } from '../geo/geodesy';
import { searchPlaces, searchPlacesHard, type Place } from '../geo/geocode';
import { Pin, Search, X } from './icons';

interface Props {
  value: string;
  placeholder: string;
  near?: LngLat | null;
  label?: string;
  icon?: 'pin' | 'search' | 'none';
  soft?: boolean;
  autoFocus?: boolean;
  onPick: (place: Place) => void;
  onClear?: () => void;
  trailing?: React.ReactNode;
}

export function PlaceSearch(p: Props) {
  const [text, setText] = useState(p.value);
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'slow' | 'none' | null>(null);
  const abort = useRef<AbortController | null>(null);
  const listId = useId();

  useEffect(() => { if (!editing) setText(p.value); }, [p.value, editing]);

  useEffect(() => {
    if (!editing) return;
    const q = text.trim();
    if (q.length < 2) { setResults([]); return; }
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const t = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try { const r = await searchPlaces(q, { signal: ctrl.signal, near: p.near ?? undefined }); if (!ctrl.signal.aborted) { setResults(r); setActive(r.length ? 0 : -1); } }
      catch { if (!ctrl.signal.aborted) setError('slow'); }
      finally { if (!ctrl.signal.aborted) setBusy(false); }
    }, 280);
    return () => { clearTimeout(t); ctrl.abort(); setBusy(false); };
  }, [text, editing, p.near]);

  const pick = (pl: Place) => { setEditing(false); setResults([]); setError(null); setText(pl.name); p.onPick(pl); };
  // Deliberate search (Enter with no suggestions): skip the debounce and allow the Nominatim fallback.
  const searchNow = async () => {
    const q = text.trim();
    if (q.length < 2) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true);
    setError(null);
    try {
      const r = await searchPlacesHard(q, { signal: ctrl.signal, near: p.near ?? undefined });
      if (ctrl.signal.aborted) return;
      if (r.length) pick(r[0]);
      else { setResults([]); setError('none'); }
    } catch { if (!ctrl.signal.aborted) setError('slow'); }
    finally { if (!ctrl.signal.aborted) setBusy(false); }
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) pick(results[active]); else if (results[0]) pick(results[0]); else void searchNow(); }
    else if (e.key === 'Escape') { setEditing(false); setResults([]); setError(null); (e.target as HTMLInputElement).blur(); }
  };

  return (
    <div className={`field${p.soft ? ' field--soft' : ''}`}>
      {p.label ? <span className="field__label">{p.label}</span> : null}
      {p.icon === 'pin' ? <span className="field__icon"><Pin /></span> : p.icon === 'search' ? <span className="field__icon"><Search /></span> : null}
      <input
        value={text}
        placeholder={p.placeholder}
        autoFocus={p.autoFocus}
        role="combobox"
        aria-expanded={editing && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={editing && results.length > 0 && active >= 0 ? `${listId}-${active}` : undefined}
        onFocus={e => { setEditing(true); e.target.select(); }}
        onBlur={() => setTimeout(() => { setEditing(false); setResults([]); setError(null); }, 150)}
        onChange={e => { setEditing(true); setText(e.target.value); }}
        onKeyDown={onKey}
      />
      {busy ? <span className="muted" style={{ fontSize: 11 }}>…</span> : null}
      {p.onClear && p.value ? <button className="field__btn" onClick={p.onClear} aria-label="Clear"><X /></button> : null}
      {p.trailing}
      {editing && results.length > 0 ? (
        <div className="suggest" id={listId} role="listbox">
          {results.map((r, i) => (
            <button key={`${r.lngLat[0]},${r.lngLat[1]}`} id={`${listId}-${i}`} role="option" tabIndex={-1} aria-selected={i === active} onMouseDown={e => e.preventDefault()} onClick={() => pick(r)}>
              <div className="suggest__name">{r.name}</div>
              {r.detail ? <div className="suggest__detail">{r.detail}</div> : null}
            </button>
          ))}
        </div>
      ) : editing && error ? (
        <div className="suggest suggest--note" role="status">
          {error === 'none' ? 'No places found — try a simpler search.' : busy ? 'Searching…' : 'The place search is slow right now — press Enter to try a backup search.'}
        </div>
      ) : null}
    </div>
  );
}
