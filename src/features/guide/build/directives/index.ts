import { resolveCard } from './card.ts';
import { resolveDifficultyPenalties } from './difficultyPenalties.ts';
import { resolveGlossary } from './glossary.ts';
import { resolveRecipeOutput } from './recipeOutput.ts';
import { resolveRecipes } from './recipes.ts';
import { resolveSecretRecipe, resolveSecretRecipes } from './secretRecipes.ts';
import { resolveSource } from './source.ts';
import type { DirectiveResolver } from './types.ts';
import { resolveVendor } from './vendor.ts';

export { resolveTerm } from './glossary.ts';
export type { DirectiveResolver } from './types.ts';

/** Leaf directives (`::name[arg]`) by name */
export const LEAF_DIRECTIVES: Readonly<Partial<Record<string, DirectiveResolver>>> = {
  source: resolveSource,
  'secret-recipes': resolveSecretRecipes,
  'secret-recipe': resolveSecretRecipe,
  'recipe-output': resolveRecipeOutput,
  recipes: resolveRecipes,
  vendor: resolveVendor,
  'difficulty-penalties': resolveDifficultyPenalties,
  glossary: resolveGlossary,
  card: resolveCard,
};
