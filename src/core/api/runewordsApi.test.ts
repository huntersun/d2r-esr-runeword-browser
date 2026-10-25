import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchRunewordsHtml, fetchRunewordsPage } from './runewordsApi';

function stubFetch(headers?: Record<string, string>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: headers === undefined ? undefined : new Headers(headers),
      text: () => Promise.resolve('<html></html>'),
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchRunewordsPage', () => {
  it('returns the HTML and the Last-Modified header as an ISO string', async () => {
    stubFetch({ 'Last-Modified': 'Wed, 21 Oct 2026 09:49:06 GMT' });
    expect(await fetchRunewordsPage()).toEqual({ html: '<html></html>', lastModified: '2026-10-21T09:49:06.000Z' });
  });

  it('returns null when the header is missing or unparsable', async () => {
    stubFetch({});
    expect((await fetchRunewordsPage()).lastModified).toBeNull();
    stubFetch({ 'Last-Modified': 'not a date' });
    expect((await fetchRunewordsPage()).lastModified).toBeNull();
    stubFetch();
    expect((await fetchRunewordsPage()).lastModified).toBeNull();
  });

  it('keeps fetchRunewordsHtml returning only the HTML', async () => {
    stubFetch({ 'Last-Modified': 'Wed, 21 Oct 2026 09:49:06 GMT' });
    expect(await fetchRunewordsHtml()).toBe('<html></html>');
  });
});
