import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { ItemSource } from '../engine/schema.ts';
import { buildSourcesBundle, type SourceTables } from './bundleSources.ts';
import { readEsrSources } from './esrSources.ts';
import { generateBundles } from './generateBundles.ts';
import { displayName } from './itemNames.ts';
import { readPluginUniques } from './pluginDrops.ts';
import { parseTsv } from './tsv.ts';

const table = (rows: string[][]) => parseTsv(rows.map((row) => row.join('\t')).join('\n'));

const ITEM_COLUMNS = ['name', 'code', 'namestr', 'type', 'spawnable', 'normcode', 'ubercode', 'ultracode', 'GheedMin', 'GheedMax'];
const monsterIds = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];

const tables: SourceTables = {
  weapons: table([
    ITEM_COLUMNS,
    ['Hand Axe', 'hax', 'hax', 'axe', '1', 'hax', '9ha', '7ha', '', ''],
    ['Hatchet', '9ha', '9ha', 'axe', '1', 'hax', '9ha', '7ha', '', ''],
    ['Mythical Wand', 'm04', 'm04', 'wand', '1', '', '', '', '', ''],
    ['Death Blade', 'dd1', 'dd1', 'swor', '0', '', '', '', '', ''],
  ]),
  armor: table([ITEM_COLUMNS]),
  misc: table([
    ITEM_COLUMNS,
    ['Small Charm', 'cm1', 'cm1', 'scha', '1', '', '', '', '', ''],
    ['Coupon nor Armor 1', '01c', '01c', 'cpn1', '1', '', '', '', '', ''],
    ['Coupon Wild Card', '99j', '99j', 'cpn1', '1', '', '', '', '', ''],
    ['Material', 'mat', 'mat', 'body', '1', '', '', '', '', ''],
    ['Orb', 'orb', 'orb', 'cube', '1', '', '', '', '', ''],
    ['Hammer', 'hh2', 'hh2', 'dstn', '1', '', '', '', '', ''],
    ['Donut', 'sdo', 'sdo', 'cube', '1', '', '', '', '0', '1'],
    ['Healing Potion', 'hp1', 'hp1', 'hpot', '1', '', '', '', '', ''],
    ['Unused', 'zzz', 'zzz', 'misc', '1', '', '', '', '', ''],
    ['Big Ruby', 'grb', 'grb', 'gemr', '1', '', '', '', '', ''],
  ]),
  uniqueitems: table([
    ['index', 'disabled', 'spawnable', 'rarity', 'lvl', 'code'],
    ['Pelta', '', '1', '0', '10', 'hax'],
    ['Basher', '', '1', '1', '4', 'hax'],
    ['Mephisto', '', '1', '3', '100', 'm04'],
    ['Frost', '', '1', '1', '100', 'dd1'],
    ['Anni', '', '1', '0', '99', 'cm1'],
    ['Torch', '', '', '1', '75', 'cm1'],
    ['Lost', '', '', '0', '1', 'cm1'],
    ['Gone', '1', '1', '1', '1', 'hax'],
    // Same display names as Pelta / Basher: merged into the first entry
    ['Pelta LoD', '', '1', '1', '10', '9ha'],
    ['Basher Old', '', '', '0', '1', 'hax'],
    ['', '', '1', '1', '1', 'hax'],
  ]),
  setitems: table([
    ['index', 'disabled', 'spawnable', 'lvl', 'item'],
    ['Set Axe', '', '1', '10', 'hax'],
  ]),
  cubemain: table([
    ['description', 'enabled', 'input 1', 'input 2', 'output', 'output b'],
    ['Coupon', '1', '"01c,qty=3"', '', 'Pelta', ''],
    ['Reroll', '1', 'Basher', 'gpr', 'Basher', ''],
    ['Disabled', '0', 'gpr', '', 'Anni', ''],
    ['Hammer', '1', 'mat', '', '"hh2,qty=2"', ''],
    ['Gem upgrade', '1', 'gpr', '99j', 'grb', ''],
    ['Potion', '1', 'hp1', '', 'sdo', ''],
  ]),
  treasureclassex: table([
    ['Treasure Class', 'Item1', 'Item2', 'Item3'],
    ['Lich TC', 'Frost', '', ''],
    ['ROP (H)', 'Anni', 'Set Axe', ''],
    ['Materials', 'mat', 'weap96', ''],
    ['Act Junk', 'Materials', '', ''],
    ['Hammer TC', 'hh2', '', ''],
    ['Orb Tier 1', 'orb', '', ''],
    ['EGM Boss', 'Orb Tier 1', '', ''],
  ]),
  monstats: table([
    ['Id', 'NameStr', 'TreasureClass', 'TreasureClass(H)'],
    ['lich', 'TheLichKing', 'Lich TC', ''],
    ['diabloclone', 'Diablo', '', 'ROP (H)'],
    ...monsterIds.map((id) => [id, id, 'Act Junk', '']),
    ...monsterIds.map((id) => [`map${id}`, `map${id}`, '', 'EGM Boss']),
  ]),
  superuniques: table([
    ['Superunique', 'Name', 'TC', 'TC(H)'],
    ['Bloodwitch', 'Bloodwitch the Wild', 'Hammer TC', ''],
  ]),
  gamble: table([
    ['name', 'code'],
    ['Hatchet', '9ha'],
  ]),
};

const strings = new Map([
  ['TheLichKing', 'The Lich King'],
  ['Diablo', 'Diablo'],
  ['Pelta', 'Pelta Lunata'],
  ['Pelta LoD', 'Pelta Lunata'],
  ['Basher Old', 'Basher'],
  ['Set Axe', 'Basher'],
  ['01c', '(Buckler, Pelta Lunata)\nAncient Coupon'],
  ['Bloodwitch the Wild', 'Bloodwitch the Wild'],
]);

const PLUGIN = `[boss_set_unique_drop]
enabled = true
[[boss_set_unique_drop.rule]]
monsters = [704, 705, 709]
unique = "Torch"
`;

const { bundle } = buildSourcesBundle(tables, strings, PLUGIN);
const texts = (name: string) => bundle.items.find((item: ItemSource) => item.name === name)?.labels.map((label) => label.text);

describe('buildSourcesBundle', () => {
  it('merges entries sharing kind and name: first code, label union in precedence order, Unknown dropped', () => {
    const pelta = bundle.items.filter((item) => item.name === 'Pelta Lunata');
    expect(pelta).toHaveLength(1);
    expect(pelta[0]?.code).toBe('hax');
    expect(pelta[0]?.labels.map((entry) => entry.text)).toEqual(['Cube: Ancient Coupon', 'Drops (random)', 'Gamble']);
    // "Basher Old" alone would be Unknown
    expect(bundle.items.filter((item) => item.name === 'Basher' && item.item === 'unique')).toHaveLength(1);
    expect(texts('Basher')).toEqual(['Drops (random)', 'Gamble']);
  });

  it('keeps entries sharing a name across kinds separate', () => {
    expect(bundle.items.filter((item) => item.name === 'Basher').map((item) => item.item)).toEqual(['unique', 'set']);
  });

  it('labels random uniques drop + gamble (base family in gamble.txt) and ignores cube rerolls', () => {
    expect(texts('Basher')).toEqual(['Drops (random)', 'Gamble']);
  });

  it('labels level ≥ 100 uniques as endgame-map drops', () => {
    expect(texts('Mephisto')).toEqual(['Drops in Endgame Maps']);
  });

  it('labels uniques named in a few monsters’ treasure classes as boss drops, bypassing rarity', () => {
    expect(texts('Frost')).toEqual(['Drops from The Lich King']);
    expect(texts('Anni')).toEqual(['Drops from Diablo Clone']);
  });

  it('labels plugin uniques and falls back to Unknown', () => {
    expect(texts('Torch')).toEqual(['Boss drop (launcher plugin)']);
    expect(texts('Lost')).toEqual(['Unknown']);
  });

  it('skips disabled and unnamed unique rows', () => {
    expect(texts('Gone')).toBeUndefined();
    expect(bundle.items.filter((item) => item.item === 'unique')).toHaveLength(7);
  });

  it('labels set items as random drops plus their named treasure classes', () => {
    expect(bundle.items.find((item) => item.item === 'set')).toEqual({
      name: 'Basher',
      code: 'hax',
      item: 'set',
      labels: [
        { kind: 'boss', text: 'Drops from Diablo Clone' },
        { kind: 'drop', text: 'Drops (random)' },
      ],
    });
  });

  it('labels misc by monster count: boss (≤ 5, superuniques included), maps (map monsters only), drop', () => {
    expect(texts('Hammer')).toEqual(['Cube', 'Drops from Bloodwitch the Wild']);
    expect(texts('Orb')).toEqual(['Drops in Endgame Maps']);
    expect(texts('Material')).toEqual(['Drops (random)']);
  });

  it('labels vendors and does not treat the Wild Card as an Ancient Coupon', () => {
    expect(texts('Donut')).toEqual(['Cube', 'Buy: Gheed']);
    expect(texts('Big Ruby')).toEqual(['Cube']);
  });

  it('keeps only misc referenced by the cube, a vendor or a treasure class, without potions', () => {
    // cm1 is only a unique base here; hp1 is a potion; zzz is referenced nowhere
    expect(bundle.items.filter((item) => item.item === 'misc').map((item) => item.code)).toEqual([
      '01c',
      '99j',
      'mat',
      'orb',
      'hh2',
      'sdo',
      'grb',
    ]);
    expect(texts('Ancient Coupon (Buckler, Pelta Lunata)')).toEqual(['Unknown']);
  });
});

describe('readPluginUniques', () => {
  it('reads double- and single-quoted unique names', () => {
    expect([...readPluginUniques(`unique = "Hellfire Torch"\n  unique = 'Say "Hi"'\n# unique = "Commented"`)]).toEqual([
      'Hellfire Torch',
      'Say "Hi"',
    ]);
  });

  it('returns nothing for a missing or disabled config', () => {
    expect(readPluginUniques(null).size).toBe(0);
    expect(readPluginUniques('enabled = false\nunique = "Hellfire Torch"').size).toBe(0);
  });
});

describe('displayName', () => {
  it('reads multi-line names bottom-up', () => {
    expect(displayName('(Buckler, Pelta Lunata)\nAncient Coupon')).toBe('Ancient Coupon (Buckler, Pelta Lunata)');
    expect(displayName(' Forging Hammer ')).toBe('Forging Hammer');
  });
});

const ESR_DIR = resolve(__dirname, '../../../../', process.env.ESR_SOURCE_DIR ?? '../Eastern_Sun_Resurrected');

describe.skipIf(!existsSync(ESR_DIR))('sources generated from the ESR clone', () => {
  const { sources } = generateBundles(readEsrSources(ESR_DIR));
  const kinds = (name: string) => sources.items.find((item) => item.name === name)?.labels.map((label) => label.kind);
  const labelTexts = (name: string) => sources.items.find((item) => item.name === name)?.labels.map((label) => label.text);

  it('matches the verified examples', () => {
    expect(labelTexts('Pelta Lunata')).toEqual(['Cube: Ancient Coupon']);
    expect(kinds("Krok's Basher")).toEqual(['drop', 'gamble']);
    expect(kinds("Mephisto's Will")).toEqual(['maps']);
    expect(labelTexts('Frostmourne')).toEqual(['Drops from The Lich King']);
    expect(labelTexts('Annihilus')).toEqual(['Drops from Diablo Clone']);
    expect(kinds('Hellfire Torch')).toEqual(['plugin']);
    expect(kinds('Kill Ledger')).toEqual(['cube']);
    expect(kinds('Orb of Anointment')).toEqual(['maps']);
    expect(labelTexts('Forging Hammer')).toEqual(['Cube', "Drops from Bloodwitch the Wild, Uldyssian's Hound"]);
  });
});
