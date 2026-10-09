import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { GAME_DATA_SCHEMA } from '../schema.ts';
import { GameDataFetchError, GameDataSchemaError, loadGameDataFile, loadManifest, resetGameDataCache } from './loadGameData.ts';

const manifest = {
  schema: GAME_DATA_SCHEMA,
  esrVersion: '3.2.10',
  esrTag: '3.2.10',
  esrCommit: 'abc',
  generatedAt: '2026-10-09T00:00:00.000Z',
  files: { types: { hash: 'h1', bytes: 10 } },
  counts: {},
  warnings: [],
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, statusText: ok ? 'OK' : 'Server Error', json: () => Promise.resolve(body) };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetGameDataCache();
  fetchMock = vi.fn((url: string) => {
    if (url.includes('manifest.json')) return Promise.resolve(jsonResponse(manifest));
    return Promise.resolve(jsonResponse({ types: [], classes: [] }));
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadGameData', () => {
  it('fetches the manifest without cache and the file with its hash', async () => {
    const types = await loadGameDataFile('types');
    expect(types).toEqual({ types: [], classes: [] });
    expect(fetchMock).toHaveBeenCalledWith('/game-data/manifest.json', { cache: 'no-cache' });
    expect(fetchMock).toHaveBeenCalledWith('/game-data/types.json?v=h1', undefined);
  });

  it('caches the manifest and files', async () => {
    await loadGameDataFile('types');
    await loadGameDataFile('types');
    await loadManifest();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears a failed request so a retry refetches', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse(null, false)));
    await expect(loadManifest()).rejects.toBeInstanceOf(GameDataFetchError);
    await expect(loadManifest()).resolves.toEqual(manifest);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears a failed file request so a retry refetches', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.includes('manifest.json') ? jsonResponse(manifest) : jsonResponse(null, false))
    );
    await expect(loadGameDataFile('types')).rejects.toBeInstanceOf(GameDataFetchError);
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.includes('manifest.json') ? jsonResponse(manifest) : jsonResponse({ types: [], classes: [] }))
    );
    await expect(loadGameDataFile('types')).resolves.toEqual({ types: [], classes: [] });
  });

  it('rejects files missing from the manifest', async () => {
    await expect(loadGameDataFile('affixes')).rejects.toThrow(/not in the manifest/);
  });

  it('rejects with GameDataSchemaError on a schema mismatch', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ ...manifest, schema: GAME_DATA_SCHEMA + 1 })));
    const error: unknown = await loadGameDataFile('types').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GameDataSchemaError);
    expect((error as GameDataSchemaError).actual).toBe(GAME_DATA_SCHEMA + 1);
  });
});
