import { CATEGORIES } from '../data/categories';
import type { Vehicle } from '../data/types';
import { formatDistance, KM_PER_MILE, KM_PER_NMI } from '../geo/geodesy';
import type { Units } from '../state/urlState';

export function TripResults({ vehicles, distanceKm, units }: { vehicles: Vehicle[]; distanceKm: number; units: Units }) {
  const can = vehicles.filter(v => v.rangeKm >= distanceKm).sort((a, b) => a.rangeKm - b.rangeKm);
  const cant = vehicles.filter(v => v.rangeKm < distanceKm).sort((a, b) => b.rangeKm - a.rangeKm);
  const others = (['km', 'mi', 'nmi'] as Units[]).filter(u => u !== units);
  return (
    <div>
      <div className="big-distance" style={{ margin: '4px 0 12px' }}>
        <b>{formatDistance(distanceKm, units)}</b>
        <span>{others.map(u => formatDistance(distanceKm, u)).join(' · ')} · great-circle</span>
      </div>
      <div className="cat"><span className="cat__dot" style={{ background: CATEGORIES.ev.color, color: CATEGORIES.ev.color }} /><span className="cat__name">Makes it non-stop · {can.length}</span></div>
      {vehicles.length === 0 ? <div className="empty">No vehicles selected — pick some under Range rings.</div> : can.length === 0 ? <div className="empty">None of the selected vehicles can do this in one go.</div> : null}
      {can.map(v => {
        const used = distanceKm / v.rangeKm;
        return (
          <div key={v.id} className="result">
            <span className="result__dot" style={{ background: CATEGORIES[v.category].color, color: CATEGORIES[v.category].color }} />
            <div className="result__text">
              <div className="result__name">{v.name}</div>
              <div className="result__sub">{formatDistance(v.rangeKm, units)} range · {formatDistance(v.rangeKm - distanceKm, units)} to spare</div>
              <div className="result__bar"><i style={{ width: `${Math.round(used * 100)}%`, background: CATEGORIES[v.category].color, color: CATEGORIES[v.category].color }} /></div>
            </div>
            <div className="result__val">{Math.round(used * 100)}% used</div>
          </div>
        );
      })}
      <div className="cat" style={{ paddingTop: 18 }}><span className="cat__dot" style={{ background: CATEGORIES.car.color, color: CATEGORIES.car.color }} /><span className="cat__name">Needs a stop · {cant.length}</span></div>
      {cant.length === 0 && vehicles.length ? <div className="empty">Everything selected makes it non-stop.</div> : null}
      {cant.map(v => {
        const stops = Math.ceil(distanceKm / v.rangeKm) - 1;
        return (
          <div key={v.id} className="result">
            <span className="result__dot" style={{ background: CATEGORIES[v.category].color, color: CATEGORIES[v.category].color }} />
            <div className="result__text">
              <div className="result__name">{v.name}</div>
              <div className="result__sub">{formatDistance(v.rangeKm, units)} range · {Math.min(99, Math.floor((v.rangeKm / distanceKm) * 100))}% of the way</div>
            </div>
            <div className="result__val">{stops} stop{stops === 1 ? '' : 's'}</div>
          </div>
        );
      })}
      <p className="note" style={{ marginTop: 14 }}>Straight-line distance. Roads add roughly 15–25%; aircraft ranges assume typical payload and reserves ({(KM_PER_MILE).toFixed(3)} km/mi, {KM_PER_NMI} km/nm).</p>
    </div>
  );
}
