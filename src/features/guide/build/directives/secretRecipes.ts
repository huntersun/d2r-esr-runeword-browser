/**
 * `::secret-recipes` / `::secret-recipe[50]`: the `[SECRETnn]` rows of cubemain.txt, collapsed to one row per recipe
 * number (the txt repeats a recipe per base type, quality or socket count).
 */
import type { DataBlock } from '../../engine/schema.ts';
import type { EsrGuideTables } from '../esrGuideSources.ts';
import { formatInput, formatOutput } from './cubeText.ts';
import { requireEsr, type DirectiveResolver } from './types.ts';

type RecipeRow = Extract<DataBlock, { kind: 'recipes' }>['rows'][number];

const SECRET = /^\[SECRET(\d+)\]\s*(.*)$/;
/** Variants shown per input position / for the output before "…" */
const MAX_OPTIONS = 3;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** "a / b / c / … (7 variants)" */
function options(values: readonly string[]): string {
  const distinct = unique(values);
  if (distinct.length <= MAX_OPTIONS) return distinct.join(' / ');
  return `${distinct.slice(0, MAX_OPTIONS).join(' / ')} / … (${String(distinct.length)} variants)`;
}

/** Position-wise " / " join when every variant has the same number of inputs; otherwise the first variant. */
function mergeInputs(variants: readonly string[][]): string[] {
  const first = variants[0] ?? [];
  if (variants.some((inputs) => inputs.length !== first.length)) return first;
  return first.map((_, i) => options(variants.map((inputs) => inputs[i] ?? '')));
}

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
    group.outputs.push(row.outputs.map((output) => formatOutput(output, esr)).join(' + '));
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
  return { kind: 'recipes', caption: 'Secret recipes', rows: [...recipes.values()] };
};

export const resolveSecretRecipe: DirectiveResolver = (arg, ctx) => {
  const number = Number(arg ?? '');
  if (arg === null || !Number.isInteger(number) || number <= 0)
    return { error: `::secret-recipe needs a recipe number, e.g. ::secret-recipe[50]` };
  const esr = requireEsr(ctx, 'secret-recipe');
  if ('error' in esr) return esr;
  const recipe = collectSecretRecipes(esr).get(number);
  if (recipe === undefined) return { error: `::secret-recipe[${arg}]: no [SECRET${arg.padStart(2, '0')}] rows in cubemain.txt` };
  return { kind: 'recipes', caption: `Secret recipe ${String(number)}`, rows: [recipe] };
};
