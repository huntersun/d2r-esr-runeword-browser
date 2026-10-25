import { useSyncExternalStore } from 'react';
import type { ItemIconInfo } from '../engine/schema';
import { loadGameDataFile } from '../engine/browser/loadGameData';

type IconMap = Readonly<Record<string, ItemIconInfo>>;

/*
 * One shared store instead of `useGameData(['icons'])` per icon: the families table renders ~600 icons, and each
 * useGameData call would run its own effect and state update. The first subscriber starts the (cached) load; a failed
 * load leaves the page without icons until the next subscriber after it.
 */
let icons: IconMap | null = null;
let loading = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (icons === null && !loading) {
    loading = true;
    loadGameDataFile('icons').then(
      (bundle) => {
        icons = bundle.icons;
        loading = false;
        for (const notify of listeners) notify();
      },
      (error: unknown) => {
        loading = false;
        console.warn('Item icons unavailable:', error);
      }
    );
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): IconMap | null {
  return icons;
}

/** Item icons by base code; null while loading (or when icons.json failed to load). */
export function useItemIcons(): IconMap | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
