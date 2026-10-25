import { useSyncExternalStore } from 'react';
import { normaliseItemName } from '@/core/utils/itemName';
import type { IconsBundle, ItemIconInfo } from '../engine/schema';
import { loadGameDataFile } from '../engine/browser/loadGameData';

type IconMap = ReadonlyMap<string, ItemIconInfo>;

/** icons.json indexed for lookups: bases by code, uniques and set items by normalised display name. */
export interface ItemIconIndex {
  readonly bases: IconMap;
  readonly uniques: IconMap;
  readonly sets: IconMap;
}

/** What an icon is looked up by. Mythical uniques are `unique`; `code` is the base fallback for an unknown name. */
export type ItemIconRef =
  | { readonly kind: 'base'; readonly code: string }
  | { readonly kind: 'unique' | 'set'; readonly name: string; readonly code?: string };

/**
 * Names go through `normaliseItemName` on both sides (the HTM pages and the builds refs spell some names with other
 * apostrophes, casing or spacing than the string table).
 */
export function buildItemIconIndex(bundle: Pick<IconsBundle, 'bases' | 'uniques' | 'sets'>): ItemIconIndex {
  const byName = (section: Record<string, ItemIconInfo>): IconMap => {
    const map = new Map<string, ItemIconInfo>();
    for (const [name, info] of Object.entries(section)) {
      const key = normaliseItemName(name);
      if (!map.has(key)) map.set(key, info);
    }
    return map;
  };
  return { bases: new Map(Object.entries(bundle.bases)), uniques: byName(bundle.uniques), sets: byName(bundle.sets) };
}

/** The name without a trailing parenthetical: the HTM pages list "Tathamet's Awakening (Fire Variant)" and its siblings. */
export function withoutVariantSuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '');
}

/** The icon of a ref, or undefined (unknown name / code, or vanilla art). */
export function findItemIcon(index: ItemIconIndex, ref: ItemIconRef): ItemIconInfo | undefined {
  if (ref.kind === 'base') return index.bases.get(ref.code);
  const names = ref.kind === 'unique' ? index.uniques : index.sets;
  const own = names.get(normaliseItemName(ref.name)) ?? names.get(normaliseItemName(withoutVariantSuffix(ref.name)));
  return own ?? (ref.code === undefined ? undefined : index.bases.get(ref.code));
}

/*
 * One shared store instead of `useGameData(['icons'])` per icon: the families table renders ~600 icons, and each
 * useGameData call would run its own effect and state update. The first subscriber starts the (cached) load; a failed
 * load leaves the page without icons until the next subscriber after it.
 */
let icons: ItemIconIndex | null = null;
let loading = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (icons === null && !loading) {
    loading = true;
    loadGameDataFile('icons').then(
      (bundle) => {
        icons = buildItemIconIndex(bundle);
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

function getSnapshot(): ItemIconIndex | null {
  return icons;
}

/** The item icon index; null while loading (or when icons.json failed to load). */
export function useItemIcons(): ItemIconIndex | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
