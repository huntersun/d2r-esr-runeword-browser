import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GUIDE_SCHEMA } from '../schema.ts';
import { GuideFetchError, GuideSchemaError, loadGuide, resetGuideCache } from './loadGuide.ts';

const manifest = {
  schema: GUIDE_SCHEMA,
  esrVersion: '3.2.12',
  esrTag: '3.2.12',
  esrCommit: 'abc',
  generatedAt: '2026-10-10T00:00:00.000Z',
  files: { guide: { hash: 'h1', bytes: 10 } },
  counts: {},
  warnings: [],
};
const bundle = { notes: [], spine: { steps: [], questions: [] }, glossary: [], sourceRefs: [] };

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, statusText: ok ? 'OK' : 'Server Error', json: () => Promise.resolve(body) };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetGuideCache();
  fetchMock = vi.fn((url: string) => Promise.resolve(jsonResponse(url.includes('manifest.json') ? manifest : bundle)));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadGuide', () => {
  it('fetches the manifest without cache and the bundle with its hash, once', async () => {
    await expect(loadGuide()).resolves.toEqual({ manifest, bundle });
    await loadGuide();
    expect(fetchMock).toHaveBeenCalledWith('/guide/manifest.json', { cache: 'no-cache' });
    expect(fetchMock).toHaveBeenCalledWith('/guide/guide.json?v=h1', undefined);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears a failed request so a retry refetches', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse(null, false)));
    await expect(loadGuide()).rejects.toBeInstanceOf(GuideFetchError);
    await expect(loadGuide()).resolves.toEqual({ manifest, bundle });
  });

  it('rejects when the manifest does not list the bundle', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ ...manifest, files: {} })));
    await expect(loadGuide()).rejects.toThrow(/not in the manifest/);
  });

  it('rejects with GuideSchemaError on a schema mismatch', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ ...manifest, schema: GUIDE_SCHEMA + 1 })));
    const error: unknown = await loadGuide().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GuideSchemaError);
    expect((error as GuideSchemaError).actual).toBe(GUIDE_SCHEMA + 1);
  });
});
