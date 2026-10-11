import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import type { PersistentStorage } from '@/core/hooks/usePersistentState';
import { parseLootFilter } from '../engine/parse';
import { LIBRARY_STORAGE_KEY } from './libraryStorage';
import { EDITOR_FLUSH_DELAY_MS, createLootFilterSaga } from './lootFilterSaga';
import reducer, { close, createBlank, open, rename, selectRule, setHeader } from './lootFilterSlice';
import type { LootFilterEntry } from './types';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const STORED: LootFilterEntry = {
  id: 'stored',
  name: 'Stored',
  source: 'upload',
  createdAt: 1,
  updatedAt: 1,
  text: '{"formatVersion": 1, "title": "Stored", "rules": []}',
};

interface TestStorage extends PersistentStorage {
  readonly data: Map<string, string>;
  readonly setItem: ReturnType<typeof vi.fn<(key: string, value: string) => void>>;
  full: boolean;
}

function testStorage(entries: readonly LootFilterEntry[] = []): TestStorage {
  const data = new Map<string, string>();
  if (entries.length > 0) data.set(LIBRARY_STORAGE_KEY, JSON.stringify({ version: 1, entries }));
  const storage: TestStorage = {
    data,
    full: false,
    getItem: (key) => data.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      if (storage.full) throw new DOMException('full', 'QuotaExceededError');
      data.set(key, value);
    }),
  };
  return storage;
}

function setup(storage: TestStorage) {
  const onSaveFailed = vi.fn();
  const sagaMiddleware = createSagaMiddleware();
  const store = configureStore({
    reducer: { lootFilter: reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sagaMiddleware),
  });
  sagaMiddleware.run(createLootFilterSaga({ storage, onSaveFailed }));
  return { store, onSaveFailed };
}

function storedEntries(storage: TestStorage): LootFilterEntry[] {
  const raw = storage.data.get(LIBRARY_STORAGE_KEY);
  if (raw === undefined) return [];
  const parsed = JSON.parse(raw) as { entries: LootFilterEntry[] };
  return parsed.entries;
}

describe('lootFilterSaga', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates the library from storage without rewriting it', () => {
    const storage = testStorage([STORED]);
    const { store } = setup(storage);
    expect(store.getState().lootFilter.library).toEqual({ hydrated: true, entries: [STORED] });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('hydrates an empty library when nothing is stored', () => {
    const { store } = setup(testStorage());
    expect(store.getState().lootFilter.library).toEqual({ hydrated: true, entries: [] });
  });

  it('persists library changes right away', () => {
    const storage = testStorage([STORED]);
    const { store } = setup(storage);
    store.dispatch(createBlank('New one'));
    expect(storedEntries(storage).map((entry) => entry.name)).toEqual(['Stored', 'New one']);
    store.dispatch(rename({ id: 'stored', name: 'Renamed' }));
    expect(storedEntries(storage)[0].name).toBe('Renamed');
  });

  it('flushes editor edits into the entry text after the debounce and persists them', async () => {
    const storage = testStorage([STORED]);
    const { store } = setup(storage);
    store.dispatch(open('stored'));
    expect(storage.setItem).not.toHaveBeenCalled();

    store.dispatch(setHeader({ title: 'First' }));
    await vi.advanceTimersByTimeAsync(EDITOR_FLUSH_DELAY_MS - 50);
    store.dispatch(setHeader({ title: 'Second' }));
    await vi.advanceTimersByTimeAsync(EDITOR_FLUSH_DELAY_MS - 50);
    expect(store.getState().lootFilter.editor.dirty).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    expect(store.getState().lootFilter.editor.dirty).toBe(false);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(parseLootFilter(storedEntries(storage)[0].text).filter.title).toBe('Second');
  });

  it('selecting a rule is not an edit', async () => {
    const storage = testStorage([STORED]);
    const { store } = setup(storage);
    store.dispatch(open('stored'));
    store.dispatch(selectRule(null));
    await vi.advanceTimersByTimeAsync(EDITOR_FLUSH_DELAY_MS * 2);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('close persists pending edits without waiting for the debounce', () => {
    const storage = testStorage([STORED]);
    const { store } = setup(storage);
    store.dispatch(open('stored'));
    store.dispatch(setHeader({ author: 'Me' }));
    store.dispatch(close());
    expect(parseLootFilter(storedEntries(storage)[0].text).filter.author).toBe('Me');
  });

  it('close cancels the pending debounced flush: the timer does not write again', async () => {
    const storage = testStorage([STORED]);
    const { store } = setup(storage);
    store.dispatch(open('stored'));
    store.dispatch(setHeader({ author: 'Me' }));
    store.dispatch(close());
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(EDITOR_FLUSH_DELAY_MS * 2);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(parseLootFilter(storedEntries(storage)[0].text).filter.author).toBe('Me');
  });

  it('reports a full storage once and keeps working', () => {
    const storage = testStorage([STORED]);
    const { store, onSaveFailed } = setup(storage);
    storage.full = true;
    store.dispatch(createBlank('A'));
    store.dispatch(createBlank('B'));
    expect(onSaveFailed).toHaveBeenCalledTimes(1);
    expect(store.getState().lootFilter.library.entries).toHaveLength(3);

    storage.full = false;
    store.dispatch(createBlank('C'));
    expect(storedEntries(storage)).toHaveLength(4);

    storage.full = true;
    store.dispatch(createBlank('D'));
    expect(onSaveFailed).toHaveBeenCalledTimes(2);
  });
});
