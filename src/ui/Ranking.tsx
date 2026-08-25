import { CATEGORIES } from '../data/categories';
import type { Vehicle } from '../data/types';
import { formatDistance } from '../geo/geodesy';
import type { Units } from '../state/urlState';

export function Ranking({ vehicles, units }: { vehicles: Vehicle[]; units: Units }) {
  const sorted = vehicles.slice().sort((a, b) => b.rangeKm - a.rangeKm);
  const max = sorted[0]?.rangeKm ?? 1;
  if (!sorted.length) return <div className="empty">Select some vehicles to rank them.</div>;
  return (
    <div className="rank" style={{ paddingTop: 8 }}>
      {sorted.map((v, i) => (
        <div key={v.id} className="rank__row">
          <span className="rank__n">{i + 1}</span>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
              <span className="mono" style={{ fontSize: 12 }}>{formatDistance(v.rangeKm, units)}</span>
            </div>
            <div className="rank__bar"><i style={{ width: `${Math.max(1.5, (v.rangeKm / max) * 100)}%`, background: CATEGORIES[v.category].color, color: CATEGORIES[v.category].color }} /></div>
          </div>
                  </div>
      ))}
    </div>
  );
}
