import type { CategoryId } from './categories';

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
  status?: 'in production' | 'announced' | 'retired';
  notes?: string;
  /** Included in the default selection on first visit. */
  featured?: boolean;
}
