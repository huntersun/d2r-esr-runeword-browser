/** Tiny inline fixtures for the guide build tests (a few txt rows, strings and game-data entries). */
import type { GlossaryEntry } from '../engine/schema.ts';
import { createGuideContext, type DocsIndex, type GameDataInputs, type GuideContext } from './context.ts';
import { buildEsrGuideTables, type EsrGuideTables } from './esrGuideSources.ts';

function tsv(rows: string[][]): string {
  return rows.map((row) => row.join('\t')).join('\r\n');
}

const CUBE_HEADER = [
  'description',
  'enabled',
  'class',
  'numinputs',
  'input 1',
  'input 2',
  'input 3',
  'output',
  'mod 1',
  'mod 1 min',
  'mod 1 max',
  'output b',
  'output c',
  '*eol',
];

export const CUBEMAIN = tsv([
  CUBE_HEADER,
  [
    '[SECRET01] Unique Ring: Crafted Ring + P-Gem',
    '1',
    '',
    '3',
    '"rin,crf"',
    '"gem5,qty=2"',
    '01a',
    '"rin,uni"',
    '',
    '',
    '',
    '01a',
    '',
    '0',
  ],
  [
    '[SECRET01] Unique Ring: Crafted Ring + P-Gem',
    '1',
    '',
    '3',
    '"ring,crf"',
    '"gem5,qty=2"',
    '01a',
    '"usetype,uni"',
    '',
    '',
    '',
    '01a',
    '',
    '0',
  ],
  ['[SECRET02] Socket(1): Magic Ring', '1', '', '2', '"ring,mag,nos"', 'jew', '', 'usetype,mod,sock=1', '', '', '', '', '', '0'],
  ["Adventurer's Pack", '1', 'ama', '1', 'ag8', '', '', '"c11,nor"', 'sock', '1', '1', 'Kill Ledger', '', '0'],
  ["Adventurer's Pack", '1', 'sor', '1', 'ag8', '', '', '"c11,nor"', 'sock', '1', '1', 'Kill Ledger', '', '0'],
  ['[SECRET03] Disabled', '0', '', '1', 'jew', '', '', 'jew', '', '', '', '', '', '0'],
]);

export const MISC = tsv([
  ['name', 'code', 'namestr', 'TMogMin', 'GheedMin', 'GheedMax', 'GheedMagicMin', 'GheedMagicMax', 'CharsiMin', 'CharsiMax'],
  ['Ring', 'rin', 'rin', '1', '0', '0', '0', '0', '0', '0'],
  ['Jewel', 'jew', 'jew', '0', '0', '0', '1', '1', '0', '0'],
  ['Scroll 1', '01a', '01a', '0', '0', '0', '0', '0', '0', '0'],
  ["Starter's Pack", 'ag8', 'ag8', '0', '0', '0', '0', '0', '0', '0'],
  ["Noob's Charm New", 'c11', 'cm8', '0', '0', '0', '0', '0', '0', '0'],
  ['Rerolling Orb', 't01', 't01', '0', '1', '1', '0', '0', '0', '0'],
]);

export const ARMOR = tsv([
  ['name', 'code', 'namestr', 'GheedMin', 'GheedMax', 'CharsiMin', 'CharsiMax'],
  ['Skull Cap', 'skp', 'skp', '1', '2', '0', '0'],
]);

export const WEAPONS = tsv([
  ['name', 'code', 'namestr', 'CharsiMin', 'CharsiMax'],
  ['Crystal Sword', 'crs', 'crs', '1', '1'],
]);

export const ITEMTYPES = tsv([
  ['ItemType', 'Code', 'Equiv1'],
  ['Ring', 'ring', 'misc'],
  ['Perfect Gem', 'gem5', 'gem'],
]);

export const DIFFICULTYLEVELS = tsv([
  ['Name', 'ResistPenalty', 'DeathExpPenalty', 'MonsterSkillBonus'],
  ['Normal', '0', '0', '0'],
  ['Nightmare', '-40', '5', '3'],
  ['Hell', '-100', '10', '7'],
]);

export const STRINGS = JSON.stringify([
  { Key: 'rin', enUS: 'Ring' },
  { Key: 'jew', enUS: 'Jewel' },
  { Key: '01a', enUS: 'ÿc4Ancient Scroll 1' },
  { Key: 'ag8', enUS: 'Starter Pack' },
  { Key: 'cm8', enUS: "Noob's Odd Charm" },
  { Key: 't01', enUS: 'Rerolling Orb' },
  { Key: 'skp', enUS: 'Skull Cap' },
  { Key: 'crs', enUS: 'Crystal Sword' },
  { Key: 'Kill Ledger', enUS: 'ÿc@Kill Ledger' },
]);

export function fixtureEsr(): EsrGuideTables {
  return buildEsrGuideTables({
    tables: { cubemain: CUBEMAIN, misc: MISC, armor: ARMOR, weapons: WEAPONS, itemtypes: ITEMTYPES, difficultylevels: DIFFICULTYLEVELS },
    strings: [{ name: 'item-names.json', text: STRINGS }],
  });
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'Stocker', definition: 'Holds many copies of one material.', note: null },
  { term: 'Cube', definition: 'The Horadric Cube.', note: null },
];

export function fixtureGameData(): GameDataInputs {
  return {
    runewords: { runewords: [{ key: 'Runeword1', name: 'Enigma', rows: [] }] },
    bases: { bases: [{ code: 'crs', name: 'Crystal Sword' }] },
    types: { types: [{ code: 'swor', name: 'Sword' }], classes: [] },
    sources: {
      items: [
        { name: 'Annihilus', code: 'cm1', item: 'unique', labels: [{ kind: 'boss', text: 'Drops from Diablo Clone' }] },
        { name: 'Worldstone Shard', code: 'amu', item: 'set', labels: [{ kind: 'drop', text: 'Drops (random)' }] },
        { name: 'Worldstone Shard', code: 'xa1', item: 'misc', labels: [{ kind: 'boss', text: 'Drops from Baal' }] },
      ],
    },
  } as unknown as GameDataInputs;
}

export const DOCS: DocsIndex = new Map([['Eastern Sun Resurrected Cube Recipes.html', new Set(['special', 'sec'])]]);

export function fixtureContext(overrides: Partial<{ esr: EsrGuideTables | null; docs: DocsIndex | null }> = {}): GuideContext {
  return createGuideContext({
    gameData: fixtureGameData(),
    glossary: GLOSSARY,
    esr: overrides.esr === undefined ? fixtureEsr() : overrides.esr,
    docs: overrides.docs === undefined ? DOCS : overrides.docs,
  });
}
