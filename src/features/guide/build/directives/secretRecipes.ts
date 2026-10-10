/**
 * `::secret-recipes` / `::secret-recipe[50]`: the `[SECRETnn]` rows of cubemain.txt, collapsed to one row per recipe
 * number (the txt repeats a recipe per base type, quality or socket count).
 */
import type { DataBlock } from '../../engine/schema.ts';
import type { EsrGuideTables } from '../esrGuideSources.ts';
import { formatInput, formatOutput, mergeInputs, options, unique, visibleOutputs } from './cubeText.ts';
import { requireEsr, type DirectiveResolver } from './types.ts';

type RecipeRow = Extract<DataBlock, { kind: 'recipes' }>['rows'][number];

const SECRET = /^\[SECRET(\d+)\]\s*(.*)$/;
const RETURNED = '(the Ancient Scroll is returned)';

/** Secret recipes keyed by number, in file order. */
export function collectSecretRecipes(esr: EsrGuideTables): Map<number, RecipeRow> {
  const groups = new Map<number, { inputs: string[][]; outputs: string[]; descriptions: string[] }>();
  for (const row of esr.cube) {
    const match = SECRET.exec(row.description);
    if (match === null) continue;
    const number = Number(match[1]);
    let group = groups.get(number);
    if (group === undefined) {
      group = { inputs: [], outputs: [], descriptions: [] };
      groups.set(number, group);
    }
    group.inputs.push(row.inputs.map((input) => formatInput(input, esr)));
    // An output identical to an input (the Ancient Scroll) is returned unchanged; the caption says so instead.
    const outputs = visibleOutputs(row.outputs).filter((output) => !row.inputs.includes(output.spec));
    if (outputs.length > 0) group.outputs.push(outputs.map((output) => formatOutput(output, esr)).join(' + '));
    group.descriptions.push(match[2].trim());
  }

  const recipes = new Map<number, RecipeRow>();
  for (const [number, group] of groups) {
    const inputs = unique(group.inputs.map((list) => JSON.stringify(list))).map((json) => JSON.parse(json) as string[]);
    const output = options(group.outputs);
    const descriptions = unique(group.descriptions);
    const more = descriptions.length - 1;
    const note = `#${String(number)}: ${descriptions[0] ?? ''}${more > 0 ? ` (+${String(more)} variant${more > 1 ? 's' : ''})` : ''}`;
    recipes.set(number, { inputs: mergeInputs(inputs), output, note });
  }
  return recipes;
}

export const resolveSecretRecipes: DirectiveResolver = (arg, ctx) => {
  if (arg !== null) return { error: '::secret-recipes takes no argument (use ::secret-recipe[N] for one recipe)' };
  const esr = requireEsr(ctx, 'secret-recipes');
  if ('error' in esr) return esr;
  const recipes = collectSecretRecipes(esr);
  if (recipes.size === 0) return { error: '::secret-recipes found no [SECRETnn] rows in cubemain.txt' };
  return { kind: 'recipes', caption: `Secret recipes ${RETURNED}`, rows: [...recipes.values()] };
};

export const resolveSecretRecipe: DirectiveResolver = (arg, ctx) => {
  const number = Number(arg ?? '');
  if (arg === null || !Number.isInteger(number) || number <= 0)
    return { error: `::secret-recipe needs a recipe number, e.g. ::secret-recipe[50]` };
  const esr = requireEsr(ctx, 'secret-recipe');
  if ('error' in esr) return esr;
  const recipe = collectSecretRecipes(esr).get(number);
  if (recipe === undefined) return { error: `::secret-recipe[${arg}]: no [SECRET${arg.padStart(2, '0')}] rows in cubemain.txt` };
  return { kind: 'recipes', caption: `Secret recipe ${String(number)} ${RETURNED}`, rows: [recipe] };
};
