/**
 * The bundled starting point: Sully's QoL filter (v0.6.1), the filter the ESR launcher pulls live from
 * github.com/Thisisnotsully/QoL-Filter since ESR 3.2.22 (`LootFilters/sources.json`). The copy in `public/loot-filters/`
 * is his `Sullys-QoL-Filter.json` with two edits: the trailing comma after the last rule removed (strict JSON apart
 * from the `//` comments) and the `9pm` typo in an `excludeItemCodes` list fixed to `9mp` (War Pick). Up to ESR 3.2.21
 * the mod shipped an earlier conversion of the same filter as `LootFilters/esr-default-filter.json`.
 */
export const TEMPLATE_NAME = "Sully's QoL Filter";
export const TEMPLATE_CREDIT =
  "Sully's QoL filter v0.6.1, the filter the ESR launcher ships live from github.com/Thisisnotsully/QoL-Filter; icons and sounds by Sully";
export const TEMPLATE_FILE = 'sullys-qol-filter.json';

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
