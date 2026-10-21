/** The three tiers of a weapons.txt / armor.txt tier family (`normcode`, `ubercode`, `ultracode`). */
export type FamilyTier = 'normal' | 'exceptional' | 'elite';

/**
 * Where `code` sits in its tier family: 'self' when all three family columns point at the item itself (rings, charms,
 * jewels, arrows, ESR mythical bases, quest rows), the first family column equal to `code` otherwise, and null when
 * `code` is not in its own family.
 */
export function familyPosition(code: string, normcode: string, ubercode: string, ultracode: string): FamilyTier | 'self' | null {
  if (normcode === code && ubercode === code && ultracode === code) return 'self';
  if (code === normcode) return 'normal';
  if (code === ubercode) return 'exceptional';
  if (code === ultracode) return 'elite';
  return null;
}

/**
 * The tier of an item with a real tier family: three distinct family codes, one of them `code`. Undefined for items
 * without one (self-referential or malformed families, items without the columns).
 */
export function distinctFamilyTier(code: string, normcode: string, ubercode: string, ultracode: string): FamilyTier | undefined {
  if (new Set([normcode, ubercode, ultracode]).size !== 3) return undefined;
  const position = familyPosition(code, normcode, ubercode, ultracode);
  return position === 'self' || position === null ? undefined : position;
}
