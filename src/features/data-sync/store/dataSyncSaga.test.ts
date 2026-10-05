import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { db } from '@/core/db';
import appVersion from '@/assets/version.json';
import { dataSyncSaga } from './dataSyncSaga';
import dataSyncReducer, { fetchHtmlSuccess, parseDataSuccess, type FetchedHtmlData } from './dataSyncSlice';
import type { ParsedData } from '../interfaces';
import type { Runeword } from '@/core/db';

// Lets individual tests make the first parser throw; otherwise the real parser runs
const parserControl = vi.hoisted(() => ({ parseGemsError: null as Error | null }));

vi.mock('../parsers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../parsers')>();
  return {
    ...actual,
    parseGemsHtml: (html: string) => {
      if (parserControl.parseGemsError) throw parserControl.parseGemsError;
      return actual.parseGemsHtml(html);
    },
  };
});

const EMPTY_PARSED_DATA: ParsedData = {
  gems: [],
  esrRunes: [],
  lodRunes: [],
  kanjiRunes: [],
  crystals: [],
  runewords: [],
  gemwords: [],
  htmUniqueItems: [],
  mythicalUniques: [],
  ascendancies: [],
};

const EMPTY_FETCHED_HTML: FetchedHtmlData = {
  gemsHtml: '',
  gemwordsHtml: '',
  runewordsHtml: '',
  uniqueWeaponsHtml: '',
  uniqueArmorsHtml: '',
  uniqueOthersHtml: '',
  mythicalsHtml: '',
  ascendanciesHtml: '',
  esrVersion: '9.9.9',
};

// Only the primary key matters for the cache check and rollback assertions
const CACHED_RUNEWORD = { name: 'Cached', variant: 1 } as Runeword;

function createTestStore() {
  const sagaMiddleware = createSagaMiddleware();
  const store = configureStore({
    reducer: { dataSync: dataSyncReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sagaMiddleware),
  });
  sagaMiddleware.run(dataSyncSaga);
  return store;
}

beforeEach(async () => {
  parserControl.parseGemsError = null;
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('dataSyncSaga store step', () => {
  it('stores data and metadata transactionally using the version from the action payload', async () => {
    const sagaMiddleware = createSagaMiddleware();
    const store = configureStore({
      reducer: { dataSync: dataSyncReducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sagaMiddleware),
    });
    sagaMiddleware.run(dataSyncSaga);

    // Triggers handleStoreData; with esrVersion in the payload no network
    // fetch happens, and all writes run inside a single Dexie transaction.
    store.dispatch(parseDataSuccess({ ...EMPTY_PARSED_DATA, esrVersion: '9.9.9' }));

    await vi.waitFor(async () => {
      const esrVersionMeta = await db.metadata.get('esrVersion');
      expect(esrVersionMeta?.value).toBe('9.9.9');
    });

    const appVersionMeta = await db.metadata.get('appVersion');
    const lastUpdatedMeta = await db.metadata.get('lastUpdated');
    expect(appVersionMeta?.value).toBe(appVersion.version);
    expect(lastUpdatedMeta?.value).toBeTruthy();
  });
});

describe('dataSyncSaga parse/store failure fallback', () => {
  it('falls back to cached data with a warning when parsing fails and a cache exists', async () => {
    await db.runewords.put(CACHED_RUNEWORD);
    parserControl.parseGemsError = new Error('unexpected HTML format');
    const store = createTestStore();

    store.dispatch(fetchHtmlSuccess(EMPTY_FETCHED_HTML));

    await vi.waitFor(() => {
      expect(store.getState().dataSync.isInitialized).toBe(true);
    });
    const state = store.getState().dataSync;
    expect(state.isUsingCachedData).toBe(true);
    expect(state.networkWarning).toBe('Unable to process the latest data. Using cached version.');
    expect(state.error).toBeNull();
  });

  it('reports a parse error when parsing fails and there is no cache', async () => {
    parserControl.parseGemsError = new Error('unexpected HTML format');
    const store = createTestStore();

    store.dispatch(fetchHtmlSuccess(EMPTY_FETCHED_HTML));

    await vi.waitFor(() => {
      expect(store.getState().dataSync.error).toBe('Failed to parse data: unexpected HTML format');
    });
    const state = store.getState().dataSync;
    expect(state.isInitialized).toBe(false);
    expect(state.networkWarning).toBeNull();
  });

  it('keeps the rolled-back cache and falls back to it with a warning when storing fails', async () => {
    await db.runewords.put(CACHED_RUNEWORD);
    const store = createTestStore();

    // A runeword without its primary key fails bulkPut inside the transaction,
    // which rolls back the clear() so the previous cache survives
    store.dispatch(parseDataSuccess({ ...EMPTY_PARSED_DATA, runewords: [{} as Runeword], esrVersion: '9.9.9' }));

    await vi.waitFor(() => {
      expect(store.getState().dataSync.isInitialized).toBe(true);
    });
    const state = store.getState().dataSync;
    expect(state.isUsingCachedData).toBe(true);
    expect(state.networkWarning).toBe('Unable to process the latest data. Using cached version.');
    expect(state.error).toBeNull();
    expect(await db.runewords.count()).toBe(1);
    expect(await db.metadata.get('esrVersion')).toBeUndefined();
  });

  it('reports a store error when storing fails and there is no cache', async () => {
    const store = createTestStore();

    store.dispatch(parseDataSuccess({ ...EMPTY_PARSED_DATA, runewords: [{} as Runeword], esrVersion: '9.9.9' }));

    await vi.waitFor(() => {
      expect(store.getState().dataSync.error).toMatch(/^Failed to store data: /);
    });
    const state = store.getState().dataSync;
    expect(state.isInitialized).toBe(false);
    expect(state.networkWarning).toBeNull();
  });
});
