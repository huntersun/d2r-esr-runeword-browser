/** `::recipes[dstone-cycle]`: a curated cube recipe family (see cubeFamilies.ts) as a `recipes` block. */
import { CUBE_FAMILIES, familyBlock, findCubeFamily } from '../cubeFamilies.ts';
import { requireEsr, type DirectiveResolver } from './types.ts';

const KNOWN = CUBE_FAMILIES.map((family) => family.id).join(', ');

export const resolveRecipes: DirectiveResolver = (arg, ctx) => {
  if (arg === null) return { error: `::recipes needs a family id, e.g. ::recipes[dstone-cycle] (known: ${KNOWN})` };
  const family = findCubeFamily(arg);
  if (family === undefined) return { error: `::recipes[${arg}]: unknown recipe family (known: ${KNOWN})` };
  const esr = requireEsr(ctx, 'recipes');
  if ('error' in esr) return esr;
  const block = familyBlock(family, esr);
  if (block.rows.length === 0) {
    return { error: `::recipes[${arg}]: no cubemain.txt row matches ${String(family.match)}; update the family in cubeFamilies.ts` };
  }
  return block;
};
