import { downloadBlob, slugify } from '@/utils/download';
import type { BundledAssetFile } from './referencedAssets';
import { buildZip } from './zip';

export { downloadTextFile } from '@/utils/download';

function fileSlug(name: string): string {
  return slugify(name, 'loot-filter');
}

export function filterFileName(name: string): string {
  return `${fileSlug(name)}.json`;
}

export function filterZipFileName(name: string): string {
  return `${fileSlug(name)}.zip`;
}

async function fetchBytes(file: BundledAssetFile): Promise<Uint8Array> {
  const response = await fetch(file.url);
  if (!response.ok) throw new Error(`${file.path}: HTTP ${String(response.status)}`);
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Saves `<slug>.zip` holding `<slug>.json` (`text`, exactly as the plain download writes it) and the bundled sound and
 * icon files under `sounds/` and `icons/`, laid out as the plugin expects them next to the filter. Rejects when a file
 * cannot be fetched.
 */
export async function downloadFilterZip(name: string, text: string, assets: readonly BundledAssetFile[]): Promise<void> {
  const files = await Promise.all(assets.map(async (file) => ({ path: file.path, data: await fetchBytes(file) })));
  const zip = buildZip([{ path: filterFileName(name), data: new TextEncoder().encode(text) }, ...files]);
  downloadBlob(filterZipFileName(name), new Blob([zip], { type: 'application/zip' }));
}
