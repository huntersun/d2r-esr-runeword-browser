/**
 * Matches the socketable names of the live gems.htm fixture (parsed with the app's own parsers) against the misc names
 * icons.json is keyed by, the way the Socketables cards look icons up (`socketableIconRef` + `findItemIcon`).
 * Skipped when an input is missing (run `npm run test:fixtures` / `npm run game-data:icons`).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { parseCrystalsHtml } from '@/features/data-sync/parsers/crystalsParser';
import { parseEsrRunesHtml } from '@/features/data-sync/parsers/esrRunesParser';
import { parseGemsHtml } from '@/features/data-sync/parsers/gemsParser';
import { parseKanjiRunesHtml } from '@/features/data-sync/parsers/kanjiRunesParser';
import { parseLodRunesHtml } from '@/features/data-sync/parsers/lodRunesParser';
import type { SocketableCategory } from '@/features/socketables/types';
import { socketableIconRef } from '@/features/socketables/utils/socketableIcon';
import type { IconsBundle, LootFilterDataBundle } from './engine/schema.ts';
import { buildItemIconIndex, findItemIcon } from './hooks/useItemIcons.ts';

const GEMS = resolve(__dirname, '../../../test-fixtures/gems.htm');
const ICONS = resolve(__dirname, '../../../public/game-data/icons.json');
const LOOTFILTER = resolve(__dirname, '../../../public/game-data/lootfilter.json');

describe.skipIf([GEMS, ICONS, LOOTFILTER].some((path) => !existsSync(path)))('socketable icon matching (gems.htm ↔ icons.json)', () => {
  const bundle = JSON.parse(readFileSync(ICONS, 'utf-8')) as IconsBundle;
  const icons = buildItemIconIndex(bundle);
  const items = (JSON.parse(readFileSync(LOOTFILTER, 'utf-8')) as LootFilterDataBundle).items;
  const html = readFileSync(GEMS, 'utf-8');
  const socketables: { name: string; category: SocketableCategory }[] = [
    ...parseGemsHtml(html).map((item) => ({ name: item.name, category: 'gems' as const })),
    ...parseEsrRunesHtml(html).map((item) => ({ name: item.name, category: 'esrRunes' as const })),
    ...parseLodRunesHtml(html).map((item) => ({ name: item.name, category: 'lodRunes' as const })),
    ...parseKanjiRunesHtml(html).map((item) => ({ name: item.name, category: 'kanjiRunes' as const })),
    ...parseCrystalsHtml(html).map((item) => ({ name: item.name, category: 'crystals' as const })),
  ];

  // Console output of passing tests is hidden; run with a failing threshold to read the misses
  it('finds an icon for at least 99 % of the socketables', () => {
    const misses = socketables.filter((item) => findItemIcon(icons, socketableIconRef(item)) === undefined);
    console.log(
      `Socketables: ${String(socketables.length - misses.length)}/${String(socketables.length)} with an icon; ` +
        `misses (${String(misses.length)}): ${misses.map((item) => `${item.name} (${item.category})`).join(' | ')}`
    );
    expect(socketables.length).toBeGreaterThan(150);
    expect((socketables.length - misses.length) / socketables.length).toBeGreaterThanOrEqual(0.99);
  });

  it('picks the right row for a name shared by rows with different art (ESR and LoD Ko Rune)', () => {
    // Every code a ref carries names a misc row with that display name
    for (const item of socketables) {
      const { code } = socketableIconRef(item);
      if (code !== undefined) expect(items.find((row) => row.code === code)?.name, `${item.name} → ${code}`).toBe(item.name);
    }
    const ko = socketables.filter((item) => item.name === 'Ko Rune');
    expect(ko.map((item) => item.category).sort()).toEqual(['esrRunes', 'lodRunes']);
    const files = ko.map((item) => findItemIcon(icons, socketableIconRef(item))?.file);
    expect(new Set(files).size).toBe(2);
    expect(files).toContain(bundle.misc['Ko Rune#r68']?.file);
    expect(files).toContain(bundle.misc['Ko Rune#r19']?.file);
    // Every code-qualified key of a name the page lists is reached by one of its socketables (SHARED_NAME_CODES)
    const names = new Set(socketables.map((item) => item.name));
    const reached = new Set(socketables.map((item) => findItemIcon(icons, socketableIconRef(item))));
    for (const [key, icon] of Object.entries(bundle.misc)) {
      const [name = '', code] = key.split('#');
      if (code !== undefined && names.has(name)) expect(reached.has(icon), key).toBe(true);
    }
  });
});
