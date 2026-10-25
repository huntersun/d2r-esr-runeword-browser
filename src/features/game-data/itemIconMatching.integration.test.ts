/**
 * Matches the unique names of the live HTM fixtures (parsed with the app's own parsers) against the txt unique names
 * icons.json is keyed by, the way the item cards look icons up (`findItemIcon`).
 * Skipped when an input is missing (run `npm run test:fixtures` / `npm run game-data:icons`).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { normaliseItemName } from '@/core/utils/itemName';
import { parseHtmUniqueItems } from '@/features/data-sync/parsers/htmUniqueItemsParser';
import { parseMythicalUniques } from '@/features/data-sync/parsers/mythicalUniquesParser';
import type { IconsBundle, LootFilterDataBundle } from './engine/schema.ts';
import { buildItemIconIndex, findItemIcon, withoutVariantSuffix } from './hooks/useItemIcons.ts';

const FIXTURES = resolve(__dirname, '../../../test-fixtures');
const PAGES = [
  ['unique_weapons.htm', 'weapons'],
  ['unique_armors.htm', 'armors'],
  ['unique_others.htm', 'other'],
] as const;
const MYTHICALS = resolve(FIXTURES, 'unique_mythicals.htm');
const ICONS = resolve(__dirname, '../../../public/game-data/icons.json');
const LOOTFILTER = resolve(__dirname, '../../../public/game-data/lootfilter.json');
const inputs = [...PAGES.map(([file]) => resolve(FIXTURES, file)), MYTHICALS, ICONS, LOOTFILTER];

describe.skipIf(inputs.some((path) => !existsSync(path)))('item icon matching (HTM unique names ↔ icons.json)', () => {
  const icons = buildItemIconIndex(JSON.parse(readFileSync(ICONS, 'utf-8')) as IconsBundle);
  const txtNames = new Set(
    (JSON.parse(readFileSync(LOOTFILTER, 'utf-8')) as LootFilterDataBundle).uniques.map((u) => normaliseItemName(u.name))
  );
  const uniques = PAGES.flatMap(([file, page]) => parseHtmUniqueItems(readFileSync(resolve(FIXTURES, file), 'utf-8'), page));
  const mythicals = parseMythicalUniques(readFileSync(MYTHICALS, 'utf-8'));

  const report = (label: string, names: readonly string[], withIcon: number) => {
    const known = (name: string) => txtNames.has(normaliseItemName(name)) || txtNames.has(normaliseItemName(withoutVariantSuffix(name)));
    const unmatched = [...new Set(names.filter((name) => !known(name)))];
    console.log(
      `${label}: ${String(names.length - unmatched.length)}/${String(names.length)} names in the txt uniques, ` +
        `${String(withIcon)} with an icon (own or base art); unmatched (${String(unmatched.length)}): ${unmatched.join(' | ')}`
    );
    return (names.length - unmatched.length) / names.length;
  };

  // Console output of passing tests is hidden; run with a failing threshold to read the unmatched names
  it('finds at least 99 % of the HTM unique names among the txt uniques', () => {
    const withIcon = uniques.filter((item) => findItemIcon(icons, { kind: 'unique', name: item.name, code: item.baseItemCode })).length;
    expect(
      report(
        'HTM uniques',
        uniques.map((item) => item.name),
        withIcon
      )
    ).toBeGreaterThanOrEqual(0.99);
  });

  it('finds at least 99 % of the HTM mythical names among the txt uniques', () => {
    const withIcon = mythicals.filter((item) => findItemIcon(icons, { kind: 'unique', name: item.name })).length;
    expect(
      report(
        'HTM mythicals',
        mythicals.map((item) => item.name),
        withIcon
      )
    ).toBeGreaterThanOrEqual(0.99);
  });
});
