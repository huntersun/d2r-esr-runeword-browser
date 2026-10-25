import { useGameData } from '@/features/game-data/hooks/useGameData';
import type { SetItemMatch } from '../utils/setItems';

/**
 * Every set item (with its set) from the sets.json game-data bundle, for the equipment
 * picker. Undefined while loading; empty when the bundle fails to load (useGameData logs
 * the error) so the picker keeps working with the local-DB items.
 */
export function useSetItems(): readonly SetItemMatch[] | undefined {
  const state = useGameData(['sets']);
  if (state.status === 'loading') return undefined;
  if (state.status === 'error') return [];
  return state.data.sets.sets.flatMap((set) => set.items.map((item) => ({ item, set })));
}
