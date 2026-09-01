import { CATEGORIES } from '../data/categories';
import type { Vehicle } from '../data/types';
import { formatDistance, KM_PER_MILE, KM_PER_NMI } from '../geo/geodesy';
import { estimateTrip, formatDuration, type TripEstimate } from '../model/trip';
import type { Units } from '../state/urlState';

function stopLine(e: TripEstimate): string {
  if (e.stops === 0) return 'non-stop';
  const what = e.stopKind === 'charge' ? 'charge stop' : 'fuel stop';
  return `${e.stops} ${what}${e.stops === 1 ? '' : 's'} · +${formatDuration(e.stopsMin)}`;
}

export function TripResults({ vehicles, distanceKm, units }: { vehicles: Vehicle[]; distanceKm: number; units: Units }) {
  const rows = vehicles
    .map(v => ({ v, e: estimateTrip(v, distanceKm) }))
    .sort((a, b) => a.e.totalMin - b.e.totalMin);
  const can = rows.filter(r => r.e.nonstop);
  const cant = rows.filter(r => !r.e.nonstop);
  const fastest = rows[0];
  const others = (['km', 'mi', 'nmi'] as Units[]).filter(u => u !== units);
  return (
    <div>
      <div className="big-distance" style={{ margin: '4px 0 12px' }}>
        <b>{formatDistance(distanceKm, units)}</b>
        <span>{others.map(u => formatDistance(distanceKm, u)).join(' · ')} · great-circle</span>
      </div>
      {fastest ? (
        <div className="fastest">
          <span className="fastest__label">Fastest door to door</span>
          <span className="fastest__name" style={{ color: CATEGORIES[fastest.v.category].color }}>{fastest.v.name}</span>
          <span className="fastest__time">{formatDuration(fastest.e.totalMin)}</span>
        </div>
      ) : null}
      <div className="cat"><span className="cat__dot" style={{ background: CATEGORIES.ev.color, color: CATEGORIES.ev.color }} /><span className="cat__name">Makes it non-stop · {can.length}</span></div>
      {vehicles.length === 0 ? <div className="empty">No vehicles selected — pick some under Range rings.</div> : can.length === 0 ? <div className="empty">None of the selected vehicles can do this in one go.</div> : null}
      {can.map(({ v, e }) => {
        const used = distanceKm / v.rangeKm;
        return (
          <div key={v.id} className="result" title={e.basis}>
            <span className="result__dot" style={{ background: CATEGORIES[v.category].color, color: CATEGORIES[v.category].color }} />
            <div className="result__text">
              <div className="result__name">{v.name}</div>
              <div className="result__sub">{formatDistance(v.rangeKm, units)} range · {Math.round(used * 100)}% used · {formatDistance(v.rangeKm - distanceKm, units)} to spare</div>
              <div className="result__bar"><i style={{ width: `${Math.round(used * 100)}%`, background: CATEGORIES[v.category].color, color: CATEGORIES[v.category].color }} /></div>
            </div>
            <div className="result__val result__val--time">{formatDuration(e.totalMin)}</div>
          </div>
        );
      })}
      <div className="cat" style={{ paddingTop: 18 }}><span className="cat__dot" style={{ background: CATEGORIES.car.color, color: CATEGORIES.car.color }} /><span className="cat__name">Needs stops · {cant.length}</span></div>
      {cant.length === 0 && vehicles.length ? <div className="empty">Everything selected makes it non-stop.</div> : null}
      {cant.map(({ v, e }) => (
        <div key={v.id} className="result" title={e.basis}>
          <span className="result__dot" style={{ background: CATEGORIES[v.category].color, color: CATEGORIES[v.category].color }} />
          <div className="result__text">
            <div className="result__name">{v.name}</div>
            <div className="result__sub">{formatDistance(v.rangeKm, units)} range · {stopLine(e)}</div>
          </div>
          <div className="result__val result__val--time">{formatDuration(e.totalMin)}</div>
        </div>
      ))}
      <p className="note" style={{ marginTop: 14 }}>
        Times are door-to-door estimates: roads ≈1.2× the straight line at typical cruise speeds; EVs leave full and fast-charge 10–80% en route; aircraft add taxi, climb and boarding time (airliners +2 h for the airport). Hover a row for its assumptions. {KM_PER_MILE.toFixed(3)} km/mi · {KM_PER_NMI} km/nm.
      </p>
    </div>
  );
}
