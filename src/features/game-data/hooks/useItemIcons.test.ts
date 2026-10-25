import { buildItemIconIndex, findItemIcon, withoutVariantSuffix } from './useItemIcons';

describe('item icon lookup', () => {
  const axe = { file: 'axe_hand_axe.webp', w: 58, h: 128 };
  const gnasher = { file: 'axe_the_gnasher.webp', w: 60, h: 120 };
  const ward = { file: 'shield_ward.webp', w: 90, h: 100 };
  const index = buildItemIconIndex({
    bases: { hax: axe },
    uniques: { 'The Gnasher': gnasher, "Tathamet's Awakening": axe },
    sets: { "Civerb's Ward": ward },
  });

  it('finds bases by code and named items by normalised name', () => {
    expect(findItemIcon(index, { kind: 'base', code: 'hax' })).toBe(axe);
    expect(findItemIcon(index, { kind: 'base', code: 'zzz' })).toBeUndefined();
    expect(findItemIcon(index, { kind: 'unique', name: '  the  GNASHER ' })).toBe(gnasher);
    expect(findItemIcon(index, { kind: 'set', name: 'Civerb’s Ward' })).toBe(ward);
    expect(findItemIcon(index, { kind: 'set', name: 'The Gnasher' })).toBeUndefined();
  });

  it('drops a trailing variant parenthetical, then falls back to the base code', () => {
    expect(withoutVariantSuffix("Tathamet's Awakening (Fire Variant)")).toBe("Tathamet's Awakening");
    expect(findItemIcon(index, { kind: 'unique', name: "Tathamet's Awakening (Cold Variant)" })).toBe(axe);
    expect(findItemIcon(index, { kind: 'unique', name: 'Unknown', code: 'hax' })).toBe(axe);
    expect(findItemIcon(index, { kind: 'unique', name: 'Unknown' })).toBeUndefined();
  });
});
