import { readPersistentJson, writePersistentJson, type PersistentStorage } from '@/core/hooks/usePersistentState';
import { isPlainObject } from '../engine/parse';
import type { LootFilterEntry } from './types';

export const LIBRARY_STORAGE_KEY = 'loot-filters/library';
/** Where an unreadable stored library is copied once before the app starts writing a fresh one. */
export const LIBRARY_BACKUP_STORAGE_KEY = 'loot-filters/library.unreadable';
const LIBRARY_STORAGE_VERSION = 1;

export interface StoredLibrary {
  readonly version: typeof LIBRARY_STORAGE_VERSION;
  readonly entries: readonly LootFilterEntry[];
}

const SOURCES: readonly string[] = ['blank', 'upload', 'template'];

export function isLootFilterEntry(value: unknown): value is LootFilterEntry {
  return (
    isPlainObject(value) &&
    typeof value.id === 'string' &&
    value.id !== '' &&
    typeof value.name === 'string' &&
    typeof value.source === 'string' &&
    SOURCES.includes(value.source) &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === 'number' &&
    Number.isFinite(value.updatedAt) &&
    typeof value.text === 'string'
  );
}

export function isStoredLibrary(value: unknown): value is StoredLibrary {
  if (!isPlainObject(value) || value.version !== LIBRARY_STORAGE_VERSION || !Array.isArray(value.entries)) return false;
  const entries: readonly unknown[] = value.entries;
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!isLootFilterEntry(entry) || ids.has(entry.id)) return false;
    ids.add(entry.id);
  }
  return true;
}

/**
 * The stored library's entries; empty when nothing is stored. A stored value that fails the guard (corrupt, or
 * written by a newer app version) is copied to {@link LIBRARY_BACKUP_STORAGE_KEY} so the next save cannot destroy it.
 */
export function readLibrary(storage: PersistentStorage | null): readonly LootFilterEntry[] {
  const stored = readPersistentJson<StoredLibrary | null>(storage, LIBRARY_STORAGE_KEY, null, isStoredLibrary);
  if (stored) return stored.entries;
  if (storage === null) return [];
  try {
    const raw = storage.getItem(LIBRARY_STORAGE_KEY);
    if (raw !== null) {
      console.warn(`[Loot filters] The stored library is unreadable; a copy was kept under "${LIBRARY_BACKUP_STORAGE_KEY}"`);
      storage.setItem(LIBRARY_BACKUP_STORAGE_KEY, raw);
    }
  } catch {
    // Storage blocked or full: nothing more to do.
  }
  return [];
}

/** Writes the library; false when the browser refused (quota or blocked storage). */
export function writeLibrary(storage: PersistentStorage | null, entries: readonly LootFilterEntry[]): boolean {
  const value: StoredLibrary = { version: LIBRARY_STORAGE_VERSION, entries };
  return writePersistentJson(storage, LIBRARY_STORAGE_KEY, value);
}
