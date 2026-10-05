import { useLiveQuery } from 'dexie-react-hooks';

interface RecipeTable {
  toArray(): Promise<readonly { readonly allowedItems: readonly string[] }[]>;
}

/**
 * Live, alphabetically sorted list of every item type allowed by the recipes
 * in `table` (e.g. `db.runewords`, `db.gemwords`).
 */
export function useAvailableItemTypes(table: RecipeTable): readonly string[] | undefined {
  return useLiveQuery(async () => {
    const recipes = await table.toArray();
    const itemTypeSet = new Set<string>();

    for (const recipe of recipes) {
      for (const item of recipe.allowedItems) {
        itemTypeSet.add(item);
      }
    }

    // Sort alphabetically for consistent UI
    return Array.from(itemTypeSet).sort();
  }, [table]);
}
