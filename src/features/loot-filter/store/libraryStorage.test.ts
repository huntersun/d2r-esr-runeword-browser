import { describe, expect, it } from 'vitest';
import type { PersistentStorage } from '@/core/hooks/usePersistentState';
import {
  LIBRARY_BACKUP_STORAGE_KEY,
  LIBRARY_STORAGE_KEY,
  isLootFilterEntry,
  isStoredLibrary,
  readLibrary,
  writeLibrary,
} from './libraryStorage';
import type { LootFilterEntry } from './types';

const ENTRY: LootFilterEntry = { id: 'a', name: 'A', source: 'blank', createdAt: 1, updatedAt: 2, text: '{}' };

function memoryStorage(initial: Record<string, string> = {}): PersistentStorage & { readonly data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('isLootFilterEntry', () => {
  it('accepts a complete entry', () => {
    expect(isLootFilterEntry(ENTRY)).toBe(true);
  });

  it.each([
    ['missing text', { ...ENTRY, text: undefined }],
    ['empty id', { ...ENTRY, id: '' }],
    ['unknown source', { ...ENTRY, source: 'cloud' }],
    ['string timestamp', { ...ENTRY, createdAt: '1' }],
    ['NaN timestamp', { ...ENTRY, updatedAt: Number.NaN }],
    ['not an object', 'entry'],
    ['null', null],
  ])('rejects %s', (_label, value) => {
    expect(isLootFilterEntry(value)).toBe(false);
  });
});

describe('isStoredLibrary', () => {
  it('accepts version 1 with valid entries', () => {
    expect(isStoredLibrary({ version: 1, entries: [ENTRY, { ...ENTRY, id: 'b' }] })).toBe(true);
    expect(isStoredLibrary({ version: 1, entries: [] })).toBe(true);
  });

  it('rejects other versions, bad entries and duplicate ids', () => {
    expect(isStoredLibrary({ version: 2, entries: [] })).toBe(false);
    expect(isStoredLibrary({ version: 1 })).toBe(false);
    expect(isStoredLibrary({ version: 1, entries: [ENTRY, { name: 'x' }] })).toBe(false);
    expect(isStoredLibrary({ version: 1, entries: [ENTRY, ENTRY] })).toBe(false);
    expect(isStoredLibrary([ENTRY])).toBe(false);
  });
});

describe('readLibrary / writeLibrary', () => {
  it('round-trips the entries under the versioned key', () => {
    const storage = memoryStorage();
    expect(writeLibrary(storage, [ENTRY])).toBe(true);
    expect(JSON.parse(storage.data.get(LIBRARY_STORAGE_KEY) ?? '')).toEqual({ version: 1, entries: [ENTRY] });
    expect(readLibrary(storage)).toEqual([ENTRY]);
  });

  it('returns no entries when nothing is stored or storage is unavailable', () => {
    expect(readLibrary(memoryStorage())).toEqual([]);
    expect(readLibrary(null)).toEqual([]);
    expect(writeLibrary(null, [ENTRY])).toBe(false);
  });

  it('keeps a copy of an unreadable library before it can be overwritten', () => {
    const storage = memoryStorage({ [LIBRARY_STORAGE_KEY]: '{"version": 9, "entries": []}' });
    expect(readLibrary(storage)).toEqual([]);
    expect(storage.data.get(LIBRARY_BACKUP_STORAGE_KEY)).toBe('{"version": 9, "entries": []}');
  });

  it('reports a refused write (quota)', () => {
    const storage: PersistentStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(writeLibrary(storage, [ENTRY])).toBe(false);
  });
});
