/**
 * `::secret-recipes` / `::secret-recipe[50]`: the `[SECRETnn]` rows of cubemain.txt, merged per recipe
 * number (the txt repeats a recipe per base type, quality or socket count).
 */
import type { RecipeRow } from '../../engine/schema.ts';
import {
  capGroup,
  clusterWithBonus,
  distinct,
  formatInput,
  formatOutput,
  type RecipeVariant,
} from '../../../game-data/build/cube/cubeText.ts';
import type { EsrGuideTables } from '../esrGuideSources.ts';
import { withCubeLink } from './recipes.ts';
import { requireEsr, type DirectiveResolver } from './types.ts';

const SECRET = /^\[SECRET(\d+)\]\s*(.*)$/;
const RETURNED = '(the Ancient Scroll is returned)';

/** Secret recipes keyed by number (each one or more rows, see clusterVariants), in file order. */
export function collectSecretRecipes(esr: EsrGuideTables): Map<number, RecipeRow[]> {
  const groups = new Map<number, { variants: RecipeVariant[]; plain: RecipeVariant[]; descriptions: string[] }>();
  for (const row of esr.cube) {
    const match = SECRET.exec(row.description);
    if (match === null) continue;
    const number = Number(match[1]);
    let group = groups.get(number);
    if (group === undefined) {
      group = { variants: [], plain: [], descriptions: [] };
      groups.set(number, group);
    }
    // An output identical to an input (the Ancient Scroll) is returned unchanged; the caption says so instead.
    const outputs = row.outputs.filter((output) => !row.inputs.includes(output.spec));
    const inputs = row.inputs.map((input) => formatInput(input, esr));
    group.variants.push({ inputs, output: outputs.map((output) => formatOutput(output, esr)).join(' + ') });
    group.plain.push({ inputs, output: outputs.map((output) => formatOutput(output, esr, { bonus: false })).join(' + ') });
    group.descriptions.push(match[2].trim());
  }

  const recipes = new Map<number, RecipeRow[]>();
  for (const [number, group] of groups) {
    // The txt descriptions are dev labels ("Socket(4) Weapon: High-Q …"); players only see the recipe number.
    const more = distinct(group.descriptions).length - 1;
    const first = `#${String(number)}${more > 0 ? ` (+${String(more)} variant${more > 1 ? 's' : ''})` : ''}`;
    recipes.set(
      number,
      // With the bonus (level requirement, experience, gold …) unless it splits a recipe past the rows shown (#22)
      capGroup(clusterWithBonus(group.variants, group.plain), (i) => (i === 0 ? first : `#${String(number)}`))
    );
  }
  return recipes;
}

export const resolveSecretRecipes: DirectiveResolver = (arg, ctx) => {
  if (arg !== null) return { error: '::secret-recipes takes no argument (use ::secret-recipe[N] for one recipe)' };
  const esr = requireEsr(ctx, 'secret-recipes');
  if ('error' in esr) return esr;
  const recipes = collectSecretRecipes(esr);
  if (recipes.size === 0) return { error: '::secret-recipes found no [SECRETnn] rows in cubemain.txt' };
  return withCubeLink({ kind: 'recipes', caption: `Secret recipes ${RETURNED}`, rows: [...recipes.values()].flat() }, 'secret', esr);
};

export const resolveSecretRecipe: DirectiveResolver = (arg, ctx) => {
  const number = Number(arg ?? '');
  if (arg === null || !Number.isInteger(number) || number <= 0)
    return { error: `::secret-recipe needs a recipe number, e.g. ::secret-recipe[50]` };
  const esr = requireEsr(ctx, 'secret-recipe');
  if ('error' in esr) return esr;
  const recipe = collectSecretRecipes(esr).get(number);
  if (recipe === undefined) return { error: `::secret-recipe[${arg}]: no [SECRET${arg.padStart(2, '0')}] rows in cubemain.txt` };
  return { kind: 'recipes', caption: `Secret recipe ${String(number)} ${RETURNED}`, rows: recipe };
};
