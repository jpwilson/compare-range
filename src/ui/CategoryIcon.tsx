import type { CategoryId } from '../data/categories';
import { AirlinerIcon, CarIcon, EvIcon, HeliIcon, JetIcon, MotoIcon, PlaneIcon } from './icons';

export function CategoryIcon({ id, size = 18 }: { id: CategoryId; size?: number }) {
  switch (id) {
    case 'ev': return <EvIcon size={size} />;
    case 'car': return <CarIcon size={size} />;
    case 'moto': return <MotoIcon size={size} />;
    case 'heli': return <HeliIcon size={size} />;
    case 'plane': return <PlaneIcon size={size} />;
    case 'jet': return <JetIcon size={size} />;
    case 'airliner': return <AirlinerIcon size={size} />;
  }
}
