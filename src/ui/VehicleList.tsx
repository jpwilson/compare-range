import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_LIST, type CategoryId } from '../data/categories';
import type { Vehicle } from '../data/types';
import { formatDistance } from '../geo/geodesy';
import type { Units } from '../state/urlState';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  vehicles: Vehicle[];
  selected: Set<string>;
  units: Units;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], on: boolean) => void;
}

export function statusNote(v: Vehicle): string | null {
  if (v.status === 'announced') return 'announced — manufacturer claim';
  if (v.status === 'retired') return 'no longer in production';
  return null;
}

export function VehicleList(p: Props) {
  const [filter, setFilter] = useState<CategoryId | 'all' | 'selected'>('all');
  const groups = useMemo(() => {
    const by = new Map<CategoryId, Vehicle[]>();
    for (const v of p.vehicles) {
      if (filter === 'selected' && !p.selected.has(v.id)) continue;
      if (filter !== 'all' && filter !== 'selected' && v.category !== filter) continue;
      (by.get(v.category) ?? by.set(v.category, []).get(v.category)!).push(v);
    }
    return CATEGORY_LIST.filter(c => by.has(c.id)).map(c => ({ cat: c, items: by.get(c.id)!.slice().sort((a, b) => a.rangeKm - b.rangeKm) }));
  }, [p.vehicles, filter, p.selected]);

  return (
    <div>
      <div className="filters" role="group" aria-label="Filter vehicles">
        <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
        <button className="chip" aria-pressed={filter === 'selected'} onClick={() => setFilter('selected')}>Selected · {p.selected.size}</button>
        {CATEGORY_LIST.map(c => <button key={c.id} className="chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}><CategoryIcon id={c.id} size={15} />{c.short}</button>)}
      </div>
      {groups.length === 0 ? <div className="empty">Nothing selected yet — pick a few vehicles to draw their rings.</div> : null}
      {groups.map(({ cat, items }) => {
        const allOn = items.every(v => p.selected.has(v.id));
        return (
          <div key={cat.id}>
            <div className="cat">
              <span className="cat__dot" style={{ background: cat.color, color: cat.color }} />
              <span className="cat__name">{cat.name}</span>
              <button className="cat__toggle" onClick={() => p.onSetMany(items.map(v => v.id), !allOn)}>{allOn ? 'Clear' : 'All'}</button>
            </div>
            {items.map(v => {
              const on = p.selected.has(v.id);
              const note = statusNote(v);
              return (
                <button key={v.id} className="vcard" aria-pressed={on} onClick={() => p.onToggle(v.id)} title={`${v.basis}${v.notes ? ' — ' + v.notes : ''}`} style={{ ['--c' as string]: CATEGORIES[v.category].color }}>
                  <span className="vcard__icon"><CategoryIcon id={v.category} /></span>
                  <span className="vcard__text">
                    <span className="vcard__name" style={{ display: 'block' }}>{v.name}</span>
                    {v.variant || note ? <span className="vcard__sub" style={{ display: 'block' }}>{[v.variant, note].filter(Boolean).join(' · ')}</span> : null}
                  </span>
                  <span className="vcard__range">{formatDistance(v.rangeKm, p.units)}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
