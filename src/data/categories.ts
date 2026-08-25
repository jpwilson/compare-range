export type CategoryId = 'ev' | 'car' | 'moto' | 'heli' | 'plane' | 'jet' | 'airliner';

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
  /** Ring / swatch colour. Neon-on-dark palette, hex so it works everywhere (SVG, MapLibre expressions). */
  color: string;
  /** Light tint of the same hue, for chips and hovers. */
  soft: string;
  /** Native unit people quote this category's range in. */
  unit: 'mi' | 'km' | 'nmi';
  order: number;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  ev:       { id: 'ev',       name: 'Electric cars',     short: 'EVs',         color: '#3ddc84', soft: 'rgba(61, 220, 132, 0.16)', unit: 'mi',  order: 0 },
  car:      { id: 'car',      name: 'Gas & hybrid cars', short: 'Cars',        color: '#ff6b6b', soft: 'rgba(255, 107, 107, 0.16)', unit: 'mi',  order: 1 },
  moto:     { id: 'moto',     name: 'Motorcycles',       short: 'Motorcycles', color: '#ffb020', soft: 'rgba(255, 176, 32, 0.16)', unit: 'mi',  order: 2 },
  heli:     { id: 'heli',     name: 'Helicopters',       short: 'Helicopters', color: '#e879f9', soft: 'rgba(232, 121, 249, 0.16)', unit: 'nmi', order: 3 },
  plane:    { id: 'plane',    name: 'Planes',            short: 'Planes',      color: '#38bdf8', soft: 'rgba(56, 189, 248, 0.16)', unit: 'nmi', order: 4 },
  jet:      { id: 'jet',      name: 'Business jets',     short: 'Jets',        color: '#a78bfa', soft: 'rgba(167, 139, 250, 0.16)', unit: 'nmi', order: 5 },
  airliner: { id: 'airliner', name: 'Airliners',         short: 'Airliners',   color: '#22d3ee', soft: 'rgba(34, 211, 238, 0.16)', unit: 'nmi', order: 6 },
};

export const CATEGORY_LIST: Category[] = Object.values(CATEGORIES).sort((a, b) => a.order - b.order);
