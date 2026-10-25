import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fetchLatestVersion } from './versionApi';
import { REMOTE_URLS } from './remoteConfig';

const changelogHtml = readFileSync(resolve(__dirname, '../../../test-fixtures/changelogs.html'), 'utf-8');

interface FakeResponse {
  ok?: boolean;
  status?: number;
  statusText?: string;
  /** A JSON value, or a function that throws to simulate an invalid body */
  json?: unknown;
  text?: string;
  reject?: Error;
}

const METADATA_JSON = {
  schemaVersion: 1,
  metadata: { name: 'Eastern_Sun_Resurrected', modVersion: '3.2.24', author: 'Celestialray' },
  d2rloader: { version: '1.3.1' },
};

/** Stubs fetch with one response per URL (metadata and changelog). */
function stubFetch(responses: { metadata: FakeResponse; changelog?: FakeResponse }): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string) => {
    const spec = url === REMOTE_URLS.modMetadata ? responses.metadata : url === REMOTE_URLS.changelog ? responses.changelog : undefined;
    if (spec === undefined) return Promise.reject(new Error(`unexpected fetch: ${url}`));
    if (spec.reject) return Promise.reject(spec.reject);
    return Promise.resolve({
      ok: spec.ok ?? true,
      status: spec.status ?? 200,
      statusText: spec.statusText ?? 'OK',
      json: () => (typeof spec.json === 'function' ? Promise.reject(new SyntaxError('Unexpected token')) : Promise.resolve(spec.json)),
      text: () => Promise.resolve(spec.text ?? ''),
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchLatestVersion (mod metadata, primary source)', () => {
  it('reads metadata.modVersion and does not touch the changelog', async () => {
    const fetchMock = stubFetch({ metadata: { json: METADATA_JSON } });
    const result = await fetchLatestVersion();
    expect(result).toEqual({ version: '3.2.24', source: 'modMetadata', date: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(REMOTE_URLS.modMetadata);
  });

  it('accepts two-part versions and trims whitespace', async () => {
    stubFetch({ metadata: { json: { metadata: { modVersion: ' 3.12 ' } } } });
    expect((await fetchLatestVersion()).version).toBe('3.12');
  });

  it.each([
    ['a missing metadata object', { schemaVersion: 1 }],
    ['a non-string modVersion', { metadata: { modVersion: 3.2 } }],
    ['a malformed modVersion', { metadata: { modVersion: 'v3.2.24-beta' } }],
    ['a non-object body', 'oops'],
    ['a null body', null],
  ])('falls back to the changelog on %s', async (_label, json) => {
    stubFetch({ metadata: { json }, changelog: { text: changelogHtml } });
    const result = await fetchLatestVersion();
    expect(result.source).toBe('changelog');
    expect(result.version).toBe('3.2.02');
  });

  it('falls back to the changelog when the metadata body is not JSON', async () => {
    stubFetch({ metadata: { json: () => undefined }, changelog: { text: changelogHtml } });
    expect((await fetchLatestVersion()).source).toBe('changelog');
  });

  it('falls back to the changelog when the metadata request fails', async () => {
    stubFetch({ metadata: { ok: false, status: 404, statusText: 'Not Found' }, changelog: { text: changelogHtml } });
    expect((await fetchLatestVersion()).source).toBe('changelog');
  });

  it('falls back to the changelog when the metadata fetch rejects', async () => {
    stubFetch({ metadata: { reject: new TypeError('Failed to fetch') }, changelog: { text: changelogHtml } });
    const result = await fetchLatestVersion();
    expect(result).toEqual({ version: '3.2.02', source: 'changelog', date: '06/08/2026' });
  });
});

describe('fetchLatestVersion (changelog fallback)', () => {
  const metadataDown: FakeResponse = { reject: new TypeError('Failed to fetch') };

  it('parses the newest version from the real changelog fixture', async () => {
    stubFetch({ metadata: metadataDown, changelog: { text: changelogHtml } });
    const result = await fetchLatestVersion();
    // 3.2.02 is the first (newest) entry. It is listed above 3.12.09 although it sorts lower
    // numerically, so the newest version is the first heading, never the numeric maximum.
    expect(result.version).toBe('3.2.02');
    expect(result.date).toBe('06/08/2026');
  });

  it('parses three-part versions', async () => {
    stubFetch({ metadata: metadataDown, changelog: { text: '<div>Eastern Sun Resurrected 3.11.09 - 04/05/2026</div>' } });
    const result = await fetchLatestVersion();
    expect(result.version).toBe('3.11.09');
    expect(result.date).toBe('04/05/2026');
  });

  it('parses two-part versions', async () => {
    stubFetch({ metadata: metadataDown, changelog: { text: '<div>Eastern Sun Resurrected 3.12 - 30/07/2026</div>' } });
    expect((await fetchLatestVersion()).version).toBe('3.12');
  });

  it('matches the first entry when several versions are present', async () => {
    stubFetch({
      metadata: metadataDown,
      changelog: { text: '<div>Eastern Sun Resurrected 4.0 - 01/01/2027</div><div>Eastern Sun Resurrected 3.11.09 - 04/05/2026</div>' },
    });
    expect((await fetchLatestVersion()).version).toBe('4.0');
  });

  it('handles version headings wrapped across lines', async () => {
    stubFetch({ metadata: metadataDown, changelog: { text: '<b><span>Eastern\n    Sun Resurrected 3.12 -\n    30/07/2026</span></b>' } });
    const result = await fetchLatestVersion();
    expect(result.version).toBe('3.12');
    expect(result.date).toBe('30/07/2026');
  });
});

describe('fetchLatestVersion (both sources fail)', () => {
  it('throws when the changelog has no parsable version', async () => {
    stubFetch({ metadata: { ok: false, status: 500, statusText: 'Server Error' }, changelog: { text: '<div>no version here</div>' } });
    await expect(fetchLatestVersion()).rejects.toThrow('Could not determine the ESR version from the mod metadata or the changelog');
  });

  it('throws when both requests fail', async () => {
    stubFetch({ metadata: { reject: new TypeError('Failed to fetch') }, changelog: { ok: false, status: 404, statusText: 'Not Found' } });
    const error: unknown = await fetchLatestVersion().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).cause).toEqual(new Error('Failed to fetch changelog: 404 Not Found'));
  });
});
