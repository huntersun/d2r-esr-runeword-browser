/** The bundled starting point: Sully's QoL filter as converted by the ESR author (bundled with permission). */
export const TEMPLATE_NAME = "Sully's QoL Filter";
export const TEMPLATE_CREDIT = "Sully's QoL filter, converted by the ESR author, bundled with permission";

/** A file under `public/loot-filters/` (the template, bundled sounds and icons). */
export function lootFilterAssetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}loot-filters/${path}`;
}

/** Fetches the bundled template's file text. */
export async function fetchTemplateText(): Promise<string> {
  const response = await fetch(lootFilterAssetUrl('sullys-qol.json'));
  if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
  return response.text();
}
