import { REMOTE_URLS } from './remoteConfig';

export interface HtmPage {
  readonly html: string;
  /** The page's `Last-Modified` response header as an ISO string, or null when absent or unparsable. */
  readonly lastModified: string | null;
}

function parseLastModified(header: string | null | undefined): string | null {
  if (header === null || header === undefined) return null;
  const time = Date.parse(header);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/**
 * Fetches runewords.htm together with its `Last-Modified` header (CORS-safelisted),
 * which tells when the docs site was last regenerated.
 */
export async function fetchRunewordsPage(): Promise<HtmPage> {
  const response = await fetch(REMOTE_URLS.runewords);

  if (!response.ok) {
    throw new Error(`Failed to fetch runewords.htm: ${String(response.status)} ${response.statusText}`);
  }

  // Test doubles may build a response without headers; treat that like a missing header
  const headers = response.headers as Headers | undefined;
  return { html: await response.text(), lastModified: parseLastModified(headers?.get('Last-Modified')) };
}

export async function fetchRunewordsHtml(): Promise<string> {
  return (await fetchRunewordsPage()).html;
}
