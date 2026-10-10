/**
 * Browser loader for the static guide bundle in `public/guide/` (same pattern as game-data's loadGameData).
 *
 * - the manifest is always revalidated (`cache: 'no-cache'`); the bundle URL carries the content hash
 * - one cached promise for the lifetime of the page; a failed request clears it so a retry refetches
 * - a manifest with a different schema rejects with GuideSchemaError ("guide out of date, reload")
 */
import { GUIDE_SCHEMA, type GuideBundle, type GuideManifest } from '../schema.ts';

export interface LoadedGuide {
  manifest: GuideManifest;
  bundle: GuideBundle;
}

export class GuideSchemaError extends Error {
  readonly expected: number;
  readonly actual: unknown;

  constructor(actual: unknown) {
    super(`Guide schema ${String(actual)} does not match the app (expected ${String(GUIDE_SCHEMA)}). Reload the page.`);
    this.name = 'GuideSchemaError';
    this.expected = GUIDE_SCHEMA;
    this.actual = actual;
  }
}

export class GuideFetchError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'GuideFetchError';
    this.status = status;
  }
}

let guidePromise: Promise<LoadedGuide> | null = null;

function guideUrl(path: string): string {
  return `${import.meta.env.BASE_URL}guide/${path}`;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) throw new GuideFetchError(`Failed to load ${url}: ${String(response.status)} ${response.statusText}`, response.status);
  const data: unknown = await response.json();
  return data;
}

async function fetchGuide(): Promise<LoadedGuide> {
  const data = await fetchJson(guideUrl('manifest.json'), { cache: 'no-cache' });
  const schema = typeof data === 'object' && data !== null ? (data as Record<string, unknown>).schema : undefined;
  if (schema !== GUIDE_SCHEMA) throw new GuideSchemaError(schema);
  const manifest = data as GuideManifest;
  const entry = manifest.files.guide;
  if (entry === undefined) throw new GuideFetchError('Guide bundle is not in the manifest', null);
  const bundle = (await fetchJson(guideUrl(`guide.json?v=${entry.hash}`))) as GuideBundle;
  return { manifest, bundle };
}

export function loadGuide(): Promise<LoadedGuide> {
  if (guidePromise === null) {
    const promise = fetchGuide();
    guidePromise = promise;
    promise.catch(() => {
      if (guidePromise === promise) guidePromise = null;
    });
  }
  return guidePromise;
}

/** Clears the cached promise (tests, or a manual reload). */
export function resetGuideCache(): void {
  guidePromise = null;
}
