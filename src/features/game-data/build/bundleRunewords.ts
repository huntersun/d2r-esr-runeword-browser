import type { TxtRuneword, TxtRunewordRow, TxtRunewordsBundle, TypesBundle } from '../engine/schema.ts';
import type { BuildResult } from './bundleTypes.ts';
import type { ItemRow, PropertyMod, RuneRecipeRow } from './model.ts';

/** Renders a row's properties to display lines (the stat renderer); rows get `text: []` without one. */
export type ModsRenderer = (mods: readonly PropertyMod[]) => { lines: string[]; warnings: string[] };

/** Socket fillers prepended to runeword recipes for every extra socket count (Jewel, Mythical Jewel). */
export const JEWEL_CODES: readonly string[] = ['jew', 'mjw'];

/** runes.txt also holds charm gemwords ("Holy", "Rainbow", …) that are not runewords. */
const RUNEWORD_KEY = /^Runeword/;

interface Ingredient {
  name: string;
  reqLvl: number;
}

/**
 * Ingredient display names come from misc.txt `namestr` → strings (colour codes already stripped by the string table),
 * e.g. `r19` and `r68` both resolve to "Ko Rune". Names are kept raw ("Eth Rune", "Perfect Sapphire"), exactly like the
 * HTM runewords parser stores them; the matcher normalises both sides. Only codes used by a recipe are resolved.
 */
function ingredientResolver(misc: readonly ItemRow[], strings: ReadonlyMap<string, string>, warnings: string[]) {
  const rows = new Map<string, ItemRow>();
  for (const row of misc) if (!rows.has(row.code)) rows.set(row.code, row);
  const resolved = new Map<string, Ingredient | null>();

  return (code: string, key: string): Ingredient | null => {
    const cached = resolved.get(code);
    if (cached !== undefined) return cached;
    const row = rows.get(code);
    let ingredient: Ingredient | null = null;
    if (row === undefined) {
      warnings.push(`runewords: ${key} references unknown ingredient "${code}"`);
    } else {
      let name = strings.get(row.namestr)?.trim();
      if (name === undefined || name === '') {
        warnings.push(`runewords: ingredient ${code} name string "${row.namestr}" not found; using "${row.name}"`);
        name = row.name;
      }
      ingredient = { name, reqLvl: row.levelreq };
    }
    resolved.set(code, ingredient);
    return ingredient;
  };
}

export function buildRunewordsBundle(
  recipes: readonly RuneRecipeRow[],
  misc: readonly ItemRow[],
  typesBundle: TypesBundle,
  strings: ReadonlyMap<string, string>,
  renderMods?: ModsRenderer
): BuildResult<TxtRunewordsBundle> {
  const warnings: string[] = [];
  const resolveIngredient = ingredientResolver(misc, strings, warnings);
  const typeCodes = new Set(typesBundle.types.map((type) => type.code));

  // Keys in first-appearance (file) order; a key's rows in file order
  const byKey = new Map<string, TxtRuneword>();
  for (const recipe of recipes) {
    if (!RUNEWORD_KEY.test(recipe.key)) continue;

    for (const code of [...recipe.itypes, ...recipe.etypes]) {
      if (!typeCodes.has(code)) warnings.push(`runewords: ${recipe.key} references unknown item type "${code}"`);
    }

    const names: string[] = [];
    let jewels = 0;
    let reqLvl = 0;
    for (const code of recipe.codes) {
      const ingredient = resolveIngredient(code, recipe.key);
      reqLvl = Math.max(reqLvl, ingredient?.reqLvl ?? 0);
      if (JEWEL_CODES.includes(code)) jewels++;
      else names.push(ingredient?.name ?? code);
    }

    const row: TxtRunewordRow = {
      ingredients: names,
      codes: recipe.codes,
      jewels,
      sockets: recipe.codes.length,
      itypes: recipe.itypes,
      etypes: recipe.etypes,
      reqLvl,
      text: [],
    };
    if (renderMods !== undefined) {
      const rendered = renderMods(recipe.mods);
      row.text = rendered.lines;
      for (const warning of rendered.warnings) warnings.push(`runewords: ${recipe.key}: ${warning}`);
    }

    let runeword = byKey.get(recipe.key);
    if (runeword === undefined) {
      let name = strings.get(recipe.key)?.trim();
      if (name === undefined || name === '') {
        warnings.push(`runewords: name string "${recipe.key}" not found; using the key`);
        name = recipe.key;
      }
      runeword = { key: recipe.key, name, rows: [] };
      byKey.set(recipe.key, runeword);
    }
    runeword.rows.push(row);
  }

  return { bundle: { runewords: [...byKey.values()] }, warnings };
}
