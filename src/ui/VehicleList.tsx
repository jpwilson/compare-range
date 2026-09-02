import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_LIST, type CategoryId } from '../data/categories';
import type { Vehicle } from '../data/types';
import { formatDistance } from '../geo/geodesy';
import type { Units } from '../state/urlState';
import { CategoryIcon } from './CategoryIcon';
import { Chevron } from './icons';

interface Props {
  vehicles: Vehicle[];
  /** The signed-in user's own vehicles — shown in their own pinned group, not inside categories. */
  userVehicles: Vehicle[];
  showYourGroup: boolean;
  selected: Set<string>;
  units: Units;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], on: boolean) => void;
  onAdd: () => void;
  onDeleteUser: (id: string) => void;
}

export function statusNote(v: Vehicle): string | null {
  if (v.status === 'announced') return 'announced — manufacturer claim';
  if (v.status === 'retired') return 'no longer in production';
  return null;
}

function VehicleCard({ v, on, units, onToggle }: { v: Vehicle; on: boolean; units: Units; onToggle: (id: string) => void }) {
  const note = statusNote(v);
  return (
    <button className="vcard" aria-pressed={on} onClick={() => onToggle(v.id)} title={`${v.basis}${v.notes ? ' — ' + v.notes : ''}`} style={{ ['--c' as string]: CATEGORIES[v.category].color }}>
      <span className="vcard__icon"><CategoryIcon id={v.category} /></span>
      <span className="vcard__text">
        <span className="vcard__name" style={{ display: 'block' }}>{v.name}</span>
        {v.variant || note ? <span className="vcard__sub" style={{ display: 'block' }}>{[v.variant, note].filter(Boolean).join(' · ')}</span> : null}
      </span>
      <span className="vcard__range">{formatDistance(v.rangeKm, units)}</span>
    </button>
  );
}

export function VehicleList(p: Props) {
  const [filter, setFilter] = useState<CategoryId | 'all' | 'selected'>('all');
  // Everything starts collapsed — the list is a catalogue, not a wall.
  const [open, setOpen] = useState<Set<CategoryId>>(new Set());

  const groups = useMemo(() => {
    const by = new Map<CategoryId, Vehicle[]>();
    for (const v of p.vehicles) {
      if (filter === 'selected' && !p.selected.has(v.id)) continue;
      if (filter !== 'all' && filter !== 'selected' && v.category !== filter) continue;
      (by.get(v.category) ?? by.set(v.category, []).get(v.category)!).push(v);
    }
    return CATEGORY_LIST.filter(c => by.has(c.id)).map(c => ({ cat: c, items: by.get(c.id)!.slice().sort((a, b) => a.rangeKm - b.rangeKm) }));
  }, [p.vehicles, filter, p.selected]);

  const selectedVehicles = useMemo(
    () => [...p.vehicles, ...p.userVehicles].filter(v => p.selected.has(v.id)).sort((a, b) => a.rangeKm - b.rangeKm),
    [p.vehicles, p.userVehicles, p.selected],
  );

  const toggleOpen = (id: CategoryId) => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const pickCategory = (id: CategoryId) => { setFilter(id); setOpen(prev => new Set(prev).add(id)); };
  // A filtered view is an explicit ask — show it expanded.
  const expandAll = filter !== 'all';

  return (
    <div>
      <div className="filters" role="group" aria-label="Filter vehicles">
        <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
        <button className="chip" aria-pressed={filter === 'selected'} onClick={() => setFilter('selected')}>Selected · {p.selected.size}</button>
        {CATEGORY_LIST.map(c => <button key={c.id} className="chip" aria-pressed={filter === c.id} onClick={() => pickCategory(c.id)}><CategoryIcon id={c.id} size={15} />{c.short}</button>)}
      </div>
      {filter === 'all' && selectedVehicles.length > 0 ? (
        <div>
          <div className="cat cat--pinned">
            <span className="cat__name">On the map · {selectedVehicles.length}</span>
            <button className="cat__toggle" onClick={() => p.onSetMany(selectedVehicles.map(v => v.id), false)}>Clear</button>
          </div>
          {selectedVehicles.map(v => <VehicleCard key={v.id} v={v} on units={p.units} onToggle={p.onToggle} />)}
        </div>
      ) : null}
      {filter === 'all' && p.showYourGroup ? (
        <div>
          <div className="cat cat--pinned">
            <span className="cat__name">Your vehicles{p.userVehicles.length ? ` · ${p.userVehicles.length}` : ''}</span>
            <button className="cat__toggle" onClick={p.onAdd}>+ Add</button>
          </div>
          {p.userVehicles.length === 0 ? <div className="empty">Add your exact car, plane or helicopter and compare it like any other.</div> : null}
          {p.userVehicles.map(v => (
            <div key={v.id} className="urow">
              <VehicleCard v={v} on={p.selected.has(v.id)} units={p.units} onToggle={p.onToggle} />
              <button className="urow__del" onClick={() => p.onDeleteUser(v.id)} aria-label={`Delete ${v.name}`}>✕</button>
            </div>
          ))}
        </div>
      ) : null}
      {groups.length === 0 ? <div className="empty">Nothing selected yet — pick a few vehicles to draw their rings.</div> : null}
      {groups.map(({ cat, items }) => {
        const isOpen = expandAll || open.has(cat.id);
        const nSel = items.reduce((n, v) => n + (p.selected.has(v.id) ? 1 : 0), 0);
        const allOn = items.every(v => p.selected.has(v.id));
        return (
          <div key={cat.id}>
            <div className="cat cat--row">
              <button className="cat__head" aria-expanded={isOpen} onClick={() => !expandAll && toggleOpen(cat.id)}>
                <span className="cat__dot" style={{ background: cat.color, color: cat.color }} />
                <span className="cat__name">{cat.name}</span>
                <span className="cat__count">{nSel ? `${nSel} of ${items.length}` : items.length}</span>
                {!expandAll ? <span className={`cat__chev${isOpen ? ' cat__chev--open' : ''}`}><Chevron size={13} /></span> : null}
              </button>
              {isOpen ? <button className="cat__toggle" onClick={() => p.onSetMany(items.map(v => v.id), !allOn)}>{allOn ? 'Clear' : 'All'}</button> : null}
            </div>
            {isOpen ? items.map(v => <VehicleCard key={v.id} v={v} on={p.selected.has(v.id)} units={p.units} onToggle={p.onToggle} />) : null}
          </div>
        );
      })}
    </div>
  );
}
