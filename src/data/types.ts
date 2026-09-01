import type { CategoryId } from './categories';

/** DC fast-charging figures for battery-electric vehicles. */
export interface EvCharging {
  usableKwh: number;
  /** Minutes for 10→80% on the fastest DC charger the vehicle supports. */
  fastChargeMin: number;
  /** Peak DC charge rate in kW. */
  peakKw?: number;
}

export interface Vehicle {
  /** Stable id used in URLs, e.g. "tesla-model-3-lr". */
  id: string;
  name: string;
  make: string;
  category: CategoryId;
  /** Trim / model year / battery pack — shown as a subtitle. */
  variant?: string;
  /** Headline range in km (what the rings use). */
  rangeKm: number;
  /** Where the number comes from, e.g. "EPA est.", "Manufacturer, NBAA IFR reserves, 8 pax". */
  basis: string;
  /** Typical cruise / highway speed in km/h. Falls back to the category default. */
  cruiseKph?: number;
  /** Where the speed figure comes from, e.g. "252 KTAS economy cruise (Daher)". */
  speedBasis?: string;
  /** Battery-electric vehicles only — used for charge-stop estimates. */
  charge?: EvCharging;
  status?: 'in production' | 'announced' | 'retired';
  notes?: string;
  /** Included in the default selection on first visit. */
  featured?: boolean;
}
