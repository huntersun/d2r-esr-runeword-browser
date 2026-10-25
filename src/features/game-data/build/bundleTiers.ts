import type { TiersBundle } from '../engine/schema.ts';
import type { BuildResult } from './bundleTypes.ts';
import type { ItemRow } from './model.ts';
import { gearTier } from './tiers.ts';

/**
 * tiers.json: the tier of every weapons.txt / armor.txt row that has one, spawnable or not. Unique and set items often
 * sit on non-spawnable base rows (p01, q00, 7ha, …) that bases.json leaves out; misc.txt rows have no tier. The first
 * row of a duplicated code wins, like everywhere else.
 */
export function buildTiersBundle(items: readonly ItemRow[]): BuildResult<TiersBundle> {
  const codes: TiersBundle['codes'] = {};
  const seen = new Set<string>();
  for (const row of items) {
    if (row.kind === 'misc' || row.code === '' || seen.has(row.code)) continue;
    seen.add(row.code);
    const tier = gearTier(row.code, row.normcode, row.ubercode, row.ultracode, row.level);
    if (tier !== undefined) codes[row.code] = tier;
  }
  return { bundle: { codes }, warnings: [] };
}
