import { useState } from 'react';
import { CATEGORY_LIST, type CategoryId } from '../data/categories';
import type { UserVehicleInput } from '../data/userVehicles';
import { KM_PER_MILE, KM_PER_NMI } from '../geo/geodesy';
import type { Units } from '../state/urlState';
import { X } from './icons';

interface Props {
  onSave: (input: UserVehicleInput) => Promise<void>;
  onClose: () => void;
}

const TO_KM: Record<Units, number> = { km: 1, mi: KM_PER_MILE, nmi: KM_PER_NMI };

/** Modal for adding one of the user's own vehicles. */
export function VehicleForm({ onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('ev');
  const [range, setRange] = useState('');
  const [unit, setUnit] = useState<Units>('mi');
  const [cruise, setCruise] = useState('');
  const [kwh, setKwh] = useState('');
  const [chargeMin, setChargeMin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isEv = category === 'ev' || category === 'moto';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rangeNum = Number(range);
    if (!name.trim()) { setError('Give it a name.'); return; }
    if (!Number.isFinite(rangeNum) || rangeNum <= 0) { setError('Range must be a positive number.'); return; }
    const cruiseNum = cruise.trim() === '' ? undefined : Number(cruise);
    const kwhNum = kwh.trim() === '' ? undefined : Number(kwh);
    const chargeNum = chargeMin.trim() === '' ? undefined : Number(chargeMin);
    if (cruiseNum !== undefined && (!Number.isFinite(cruiseNum) || cruiseNum <= 0)) { setError('Cruise speed must be a positive number.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        category,
        rangeKm: rangeNum * TO_KM[unit],
        cruiseKph: cruiseNum,
        usableKwh: isEv ? kwhNum : undefined,
        fastChargeMin: isEv ? chargeNum : undefined,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Add your vehicle" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal__card" onSubmit={submit}>
        <button type="button" className="account__close" onClick={onClose} aria-label="Close"><X /></button>
        <h3>Add your vehicle</h3>
        <label className="frow">
          <span>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="My Cessna 182" autoFocus maxLength={80} />
        </label>
        <label className="frow">
          <span>Category</span>
          <select value={category} onChange={e => setCategory(e.target.value as CategoryId)}>
            {CATEGORY_LIST.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="frow">
          <span>Range</span>
          <span className="frow__pair">
            <input value={range} onChange={e => setRange(e.target.value)} inputMode="decimal" placeholder="450" />
            <select value={unit} onChange={e => setUnit(e.target.value as Units)}>
              <option value="mi">mi</option><option value="km">km</option><option value="nmi">nm</option>
            </select>
          </span>
        </label>
        <label className="frow">
          <span>Cruise speed <em>km/h, optional</em></span>
          <input value={cruise} onChange={e => setCruise(e.target.value)} inputMode="decimal" placeholder="category default" />
        </label>
        {isEv ? (
          <label className="frow">
            <span>Battery <em>kWh · 10–80% min, optional</em></span>
            <span className="frow__pair">
              <input value={kwh} onChange={e => setKwh(e.target.value)} inputMode="decimal" placeholder="75" />
              <input value={chargeMin} onChange={e => setChargeMin(e.target.value)} inputMode="decimal" placeholder="30" />
            </span>
          </label>
        ) : null}
        {error ? <p className="account__err">{error}</p> : null}
        <div className="modal__actions">
          <button type="button" className="linkbtn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save vehicle'}</button>
        </div>
      </form>
    </div>
  );
}
