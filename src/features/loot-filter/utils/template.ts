/**
 * The bundled starting point: the ESR default filter, which the mod ships as `LootFilters/esr-default-filter.json`
 * (Sully's QoL filter as converted by the ESR author, bundled with permission).
 */
export const TEMPLATE_NAME = 'ESR default filter';
export const TEMPLATE_CREDIT = "Sully's QoL filter, converted by the ESR author, bundled with permission";
export const TEMPLATE_FILE = 'esr-default-filter.json';

/** A file under `public/loot-filters/` (the template, bundled sounds and icons). */
export function lootFilterAssetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}loot-filters/${path}`;
}

/** Fetches the bundled template's file text. */
export async function fetchTemplateText(): Promise<string> {
  const response = await fetch(lootFilterAssetUrl(TEMPLATE_FILE));
  if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
  return response.text();
}
