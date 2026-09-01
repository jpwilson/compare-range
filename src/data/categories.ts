export type CategoryId = 'ev' | 'car' | 'hybrid' | 'moto' | 'heli' | 'plane' | 'jet' | 'airliner';

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
  /** Typical cruise / block speed in km/h, when the vehicle doesn't carry its own. */
  cruiseKph: number;
  /** Great-circle km × this ≈ real path km (roads wind; aircraft fly near-direct). */
  pathFactor: number;
  /** Fixed minutes not spent cruising: taxi/climb/descent, or airport security + boarding. */
  overheadMin: number;
  /** Minutes on the ground per refuel / charge / turnaround stop. */
  stopMin: number;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  ev:       { id: 'ev',       name: 'Electric cars', short: 'EVs',         color: '#3ddc84', soft: 'rgba(61, 220, 132, 0.16)',  unit: 'mi',  order: 0, cruiseKph: 105, pathFactor: 1.2,  overheadMin: 0,   stopMin: 35 },
  car:      { id: 'car',      name: 'Gas cars',      short: 'Gas',         color: '#ff6b6b', soft: 'rgba(255, 107, 107, 0.16)', unit: 'mi',  order: 1, cruiseKph: 105, pathFactor: 1.2,  overheadMin: 0,   stopMin: 8 },
  hybrid:   { id: 'hybrid',   name: 'Hybrids',       short: 'Hybrids',     color: '#a3e635', soft: 'rgba(163, 230, 53, 0.16)',  unit: 'mi',  order: 2, cruiseKph: 105, pathFactor: 1.2,  overheadMin: 0,   stopMin: 8 },
  moto:     { id: 'moto',     name: 'Motorcycles',   short: 'Motorcycles', color: '#ffb020', soft: 'rgba(255, 176, 32, 0.16)',  unit: 'mi',  order: 3, cruiseKph: 100, pathFactor: 1.2,  overheadMin: 0,   stopMin: 6 },
  heli:     { id: 'heli',     name: 'Helicopters',   short: 'Helicopters', color: '#e879f9', soft: 'rgba(232, 121, 249, 0.16)', unit: 'nmi', order: 4, cruiseKph: 230, pathFactor: 1.05, overheadMin: 15,  stopMin: 30 },
  plane:    { id: 'plane',    name: 'Planes',        short: 'Planes',      color: '#38bdf8', soft: 'rgba(56, 189, 248, 0.16)',  unit: 'nmi', order: 5, cruiseKph: 290, pathFactor: 1.05, overheadMin: 25,  stopMin: 45 },
  jet:      { id: 'jet',      name: 'Business jets', short: 'Jets',        color: '#a78bfa', soft: 'rgba(167, 139, 250, 0.16)', unit: 'nmi', order: 6, cruiseKph: 820, pathFactor: 1.05, overheadMin: 40,  stopMin: 60 },
  airliner: { id: 'airliner', name: 'Airliners',     short: 'Airliners',   color: '#22d3ee', soft: 'rgba(34, 211, 238, 0.16)',  unit: 'nmi', order: 7, cruiseKph: 875, pathFactor: 1.05, overheadMin: 120, stopMin: 90 },
};

export const CATEGORY_LIST: Category[] = Object.values(CATEGORIES).sort((a, b) => a.order - b.order);
