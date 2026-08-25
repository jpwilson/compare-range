import { useEffect, useId, useRef, useState } from 'react';
import type { LngLat } from '../geo/geodesy';
import { searchPlaces, type Place } from '../geo/geocode';
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
      try { const r = await searchPlaces(q, { signal: ctrl.signal, near: p.near ?? undefined }); if (!ctrl.signal.aborted) { setResults(r); setActive(r.length ? 0 : -1); } }
      catch { /* aborted or offline: keep the old list */ }
      finally { if (!ctrl.signal.aborted) setBusy(false); }
    }, 280);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [text, editing, p.near]);

  const pick = (pl: Place) => { setEditing(false); setResults([]); setText(pl.name); p.onPick(pl); };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) pick(results[active]); else if (results[0]) pick(results[0]); }
    else if (e.key === 'Escape') { setEditing(false); setResults([]); (e.target as HTMLInputElement).blur(); }
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
        onFocus={e => { setEditing(true); e.target.select(); }}
        onBlur={() => setTimeout(() => { setEditing(false); setResults([]); }, 150)}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKey}
      />
      {busy ? <span className="muted" style={{ fontSize: 11 }}>…</span> : null}
      {p.onClear && p.value ? <button className="field__btn" onClick={p.onClear} aria-label="Clear"><X /></button> : null}
      {p.trailing}
      {editing && results.length > 0 ? (
        <div className="suggest" id={listId} role="listbox">
          {results.map((r, i) => (
            <button key={`${r.lngLat[0]},${r.lngLat[1]}`} role="option" aria-selected={i === active} onMouseDown={e => e.preventDefault()} onClick={() => pick(r)}>
              <div className="suggest__name">{r.name}</div>
              {r.detail ? <div className="suggest__detail">{r.detail}</div> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
