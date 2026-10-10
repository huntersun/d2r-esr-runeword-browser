import { usePersistentState } from '@/core/hooks/usePersistentState';
import { addVisited, isVisitedList, VISITED_STORAGE_KEY } from '../utils/visited';

const EMPTY: readonly string[] = [];

/**
 * The viewer's visited guide notes (localStorage). Each screen reads it once on mount and passes `visited` down, so
 * chips, cards and graph nodes of one screen agree.
 */
export function useVisitedNotes() {
  const [list, setList] = usePersistentState<readonly string[]>(VISITED_STORAGE_KEY, EMPTY, isVisitedList);
  return {
    visited: new Set(list),
    count: list.length,
    markVisited: (slug: string) => {
      setList((current) => addVisited(current, slug));
    },
    reset: () => {
      setList(EMPTY);
    },
  };
}
