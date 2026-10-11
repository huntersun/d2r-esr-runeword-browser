import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUBE_FAMILIES, collectFamily, familyBlock, familyRows, findCubeFamily, MAX_FAMILY_ROWS, type CubeFamily } from './cubeFamilies.ts';
import { capGroup, clusterVariants, MAX_GROUP_ROWS } from './cubeText.ts';
import { buildEsrGuideTables, readEsrGuideSources, type EsrGuideTables } from './esrGuideSources.ts';
import { LEAF_DIRECTIVES } from './directives/index.ts';
import { markdownToBlocks } from './markdown.ts';
import { ARMOR, DIFFICULTYLEVELS, fixtureContext, STRINGS, tsv, WEAPONS } from './testContext.mock.ts';

const ESR_DIR = resolve(__dirname, '../../../..', process.env.ESR_SOURCE_DIR ?? '../Eastern_Sun_Resurrected');

const HEADER = [
  'description',
  'enabled',
  'class',
  'numinputs',
  'input 1',
  'input 2',
  'input 3',
  'output',
  'output b',
  'output c',
  '*eol',
  'b mod 1',
  'input 4',
  'input 5',
  'mod 1',
  'mod 1 min',
  'mod 1 max',
  'op',
  'param',
  'value',
];

/** A cubemain row with up to five inputs and three outputs, in the HEADER column order */
function cube(description: string, inputs: string[], outputs: string[]): string[] {
  const [first = '', second = '', third = '', fourth = '', fifth = ''] = inputs;
  const [output = '', b = '', c = ''] = outputs;
  return [description, '1', '', String(inputs.length), first, second, third, output, b, c, '0', '', fourth, fifth];
}

/** A cube row with a mod on its first output and/or an `op` condition (`[op, param, value]`) */
function cubeWith(
  description: string,
  inputs: string[],
  outputs: string[],
  { mod, condition }: { mod?: [string, number]; condition?: [number, number, number] }
): string[] {
  const [name = '', value = 0] = mod ?? [];
  const [op = 0, param = 0, threshold = 0] = condition ?? [];
  const extra = [name, String(value), String(value), condition === undefined ? '' : String(op), String(param), String(threshold)];
  return [...cube(description, inputs, outputs), ...extra];
}

const ITEMTYPES = tsv([
  ['ItemType', 'Code'],
  ['Weapon', 'weap'],
  ['Any Armor', 'armo'],
  ['Jewel', 'jewl'],
  ['Chipped Gem', 'gem0'],
  ['Blemished Gem', 'gem4'],
  ['Gem Can 8', 'can8'],
  ['Coupon norm', 'cpn1'],
  ['Flawless Gem', 'gem3'],
  ['Perfect Gem', 'gem5'],
  ['Ancient Scroll Low', 'asc1'],
  ['Helm', 'helm'],
  ['Boots', 'boot'],
  ['Wand', 'wand'],
  ['Charm', 'char'],
]);

/** Filler rows for the row cap test (matched by no curated family) */
const FILLER = Array.from({ length: MAX_FAMILY_ROWS + 2 }, (_, i) => [
  `Filler ${String(i)}`,
  '1',
  '',
  '1',
  `"ppp,qty=${String(i + 1)}"`,
  '',
  '',
  `"hly,qty=${String(i + 1)}"`,
  '',
  '',
  '0',
]);

const CUBEMAIN = tsv([
  HEADER,
  ['Dstone Transformation', '1', '', '1', 'ppp', '', '', 'hly', '', '', '0'],
  ['Dstone Transformation', '1', '', '1', 'hly', '', '', 'ppp', '', '', '0'],
  ['Dstone Transformation x2', '1', '', '1', '"ppp,qty=2"', '', '', 'hly', 'hly', '', '0'],
  ['Dstone Transformation', '0', '', '1', 'zzz', '', '', 'ppp', '', '', '0'],
  ['Weapon Skill Forging Ama', '1', '', '3', '"weap,nru"', '"qqq,qty=2"', 'gcg', 'useitem', '', '', '0'],
  ['Ring Skill Forging Ama', '1', '', '3', 'ring', '"qqq,qty=2"', 'gcg', 'useitem', '', '', '0'],
  ['Weapon Skill Forging Sor', '1', '', '3', '"weap,nru"', '"qqq,qty=2"', 'gcb', 'useitem', '', '', '0'],
  ['Remove Weapon Skill Forging Ama', '1', '', '2', '"weap,nru"', '"wms,qty=3"', '', 'useitem', 'qqq', 'qqq', '0'],
  ["Adventurer's Pack", '1', 'ama', '1', 'ag8', '', '', 'qqq', '', '', '0'],
  ["Adventurer's Pack", '1', 'sor', '1', 'ag8', '', '', 'qqq', '', '', '0'],
  ['Anvil Stone', '1', '', '1', '"ppp,qty=4"', '', '', 'qqq', '', '', '0'],
  ['"Multi Stocker + Key -> +1 Anvil Stone"', '1', '', '2', 't70', 'key', '', 'useitem', 'qqq', 'key', '0'],
  ['Coupon', '1', '', '1', '"cpn1,qty=8"', '', '', '99j', '', '', '0'],
  ['Coupon', '1', '', '1', '"01c,qty=3"', '', '', 'Pelta Lunata', '', '', '0'],
  ['Coupon', '1', '', '1', '"02c,qty=3"', '', '', "Biggin's Bonnet", '', '', '0'],
  ['Coupon', '1', '', '2', '"01c,qty=2"', '99j', '', 'Pelta Lunata', '', '', '0'],
  ['Coupon Reroll', '1', '', '2', 'rnd', '"cpn1,qty=3"', '', '01c', '', '', '0'],
  ['Coupon Reroll', '1', '', '2', 'rnd', '"cpn1,qty=3"', '', '02c', '', '', '0'],
  ["Inarius' Everburning Halo Ring", '1', '', '2', 'ring', 'u40', '', 'useitem', 'cloneitem', '', '0', 'branded'],
  ["Inarius' Everburning Halo Amulet", '1', '', '2', 'can8', 'u40', '', 'useitem', 'cloneitem', '', '0', 'branded'],
  // Stat and all skills forging: equipment of any quality is one row, jewels keep their own
  cube('Set Stat Forging Dru_else', ['"any,set"', 'qqq', 'gcg'], ['useitem']),
  cube('Stat Forging Mag/Rar Jewel', ['jewl', 'qqq', 'gcg'], ['useitem']),
  cube('Uni Stat Forging Sor_weap', ['"weap,uni"', 'qqq', 'gcb'], ['useitem']),
  cube('All Skill Forging Set', ['"any,set"', 'map', 'qqq', 'gem0'], ['useitem']),
  cube('All Skill Forging Normal', ['"weap,nor,nru"', 'map', 'qqq', 'gem0'], ['useitem']),
  // Rune forging: one row per rune and slot; the wand rows only override bonuses and are left out
  cube('Rune Forging Jewel W', ['jewl', '"r01,qty=2"', 'gem0', 'tsc'], ['useitem', 'tsc']),
  cube('Rune Forging Jewel H', ['jewl', '"r01,qty=2"', 'gem0', 'isc'], ['useitem', 'isc']),
  cube('Rune Forging wand', ['"wand,nru"', '"r02,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging weap', ['"weap,nru"', '"r01,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging weap', ['"weap,nru"', '"r02,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging weap', ['"weap,nru"', '"r03,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging weap', ['"weap,nru"', '"r84,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging armo', ['"armo,nru"', '"r01,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging armo', ['"armo,nru"', '"r02,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging armo', ['"armo,nru"', '"r03,qty=2"', 'gem0'], ['useitem']),
  cube('Rune Forging armo', ['"armo,nru"', '"r84,qty=2"', 'gem0'], ['useitem']),
  // Rune conversions
  cube('rune upgrade', ['"r01,qty=2"'], ['r02']),
  cube('rune upgrade', ['"r02,qty=2"'], ['r03']),
  cube('rune upgrade', ['r03', 'rvl'], ['r50']),
  cube('rune upgrade', ['"r51,qty=2"'], ['r52']),
  cube('rune downgrade', ['r03'], ['r02']),
  cube('rune downgrade', ['r02'], ['r01']),
  cube('Nul -> Wo', ['r50', 'rvl'], ['r03']),
  cube('Wo -> Nul', ['r03', 'rvl'], ['r50']),
  cube('decal ON', ['01l', 'r01'], ['r51']),
  cube('decal ON', ['02l', 'r03'], ['r52']),
  cube('decal ON', ['03l', 'r02'], ['r53']),
  cube('decal OFF', ['r51'], ['r01', '01l']),
  cube('decal OFF', ['r52'], ['r03', '02l']),
  cube('Moon Rune', ['r50', '"xt0,qty=1"'], ['r84']),
  cube('Moon Rune', ['can9', 'r84'], ['useitem']),
  // Tinkering: one row per organ, weapon and armor merged
  cube('Tinkering Adds Life +1: Equipment + 3 Hearts', ['"weap,nru"', '"hrt,qty=3"'], ['useitem']),
  cube('Tinkering Adds Fdam 1-3: Equipment + Fang', ['"weap,nru"', 'fng'], ['useitem']),
  cube('Tinkering Adds Life +1: Equipment + 3 Hearts', ['"armo,nru"', '"hrt,qty=3"'], ['useitem']),
  cube('Tinkering Adds Fdam 1-3: Equipment + Fang', ['"armo,nru"', 'fng'], ['useitem']),
  // Pandemonium keys
  cube('Key of Terror + Blemished Gem + Thawing Potion -> Key of Destruction Conversion', ['pk1', 'gem4', 'wms'], ['pk3', 'wms']),
  cube('Pandemonium Key Set Unwrap', ['u10'], ['pk1', 'pk2', 'pk3']),
  cube('Pandemonium Key Set Wrap', ['pk1', 'pk2', 'pk3', 'key'], ['u10', 'key']),
  cube("1 Diablo's Horn + 1 Baal's Eye + 1 Mephisto's Brain -> Portal to Tristram", ['dhn', 'bey', 'mbr'], ['Pandemonium Finale Portal']),
  // Merc Only Conversion: weapon/armor and gem colours merged, the removal gives the gem back
  cubeWith('Merc Only Conversion', ['"weap,nru"', 'qqq', 'gbk'], ['useitem'], { mod: ['mercflag', 1] }),
  cubeWith('Merc Only Conversion', ['"armo,nru"', 'qqq', 'grb'], ['useitem'], { mod: ['mercflag', 2] }),
  cube('Merc Only Conversion Trap', ['weap', 'qqq', 'gem5'], ['void']),
  cubeWith('Remove Merc Only Conversion', ['"weap,nru"', '"yps,qty=3"'], ['useitem', 'qqq', 'gbk'], { mod: ['mercflag', -1] }),
  cubeWith('Remove Merc Only Conversion', ['"armo,nru"', '"yps,qty=3"'], ['useitem', 'qqq', 'grb'], { mod: ['mercflag', -2] }),
  // Weapon mastery: one row per step, the bases merged
  cube('Awaken Weapon Mastery Token - Stag Bow', ['am1', 'u23'], ['useitem', 'u24']),
  cube('Awaken Weapon Mastery Token - Wand', ['wnd', 'u23'], ['useitem', 'u25']),
  cube('Unawaken Weapon Mastery Token', ['u24'], ['u23']),
  cubeWith('Apply Awaken Weapon Mastery Token - Stag Bow', ['"am1,nru"', 'u24', 'sss', 'qqq'], ['useitem'], { mod: ['weapon-mastery', 1] }),
  cubeWith('Apply Awaken Weapon Mastery Token - Wand', ['"wnd,nru"', 'u25', 'eee', 'qqq'], ['useitem'], { mod: ['weapon-mastery', 2] }),
  cubeWith('Remove Awaken Weapon Mastery Token - Stag Bow', ['"am1,nru"', 'sss', '"wms,qty=3"'], ['useitem'], {
    mod: ['weapon-mastery', -1],
  }),
  // Removing socketables with a Key
  cube('Unsocketable Trap', ['any', 'key'], ['void']),
  cube('Unsocket Weap', ['weap', 'key'], ['"useitem,rem"', 'key']),
  cube('Unsocket Charm', ['char', 'key'], ['"useitem,rem"', 'key']),
  // Lucion's Essence: the tiers and slots of a quality merged, socketed and unsocketed items one row
  cubeWith("Adds Socket(4): Mag bas Weapon + Lucion's Essence Remove", ['"weap,bas,mag"', 'u17'], ['"useitem,rem"'], { mod: ['sock', 4] }),
  cubeWith("Adds Socket(4): Mag exc Armor + Lucion's Essence", ['"armo,exc,mag,nos"', 'u17'], ['useitem'], { mod: ['sock', 4] }),
  cubeWith("Adds Socket(2): Rar bas Boots + Lucion's Essence", ['"boot,bas,rar,nos"', 'u17'], ['useitem'], { mod: ['sock', 2] }),
  cubeWith("Adds Socket(2): Uni eli Weapon + Lucion's Essence", ['"weap,eli,uni,nos"', 'u17'], ['useitem'], { mod: ['sock', 2] }),
  // Kill Ledger: the kill count from the row's condition; boss rows grouped by ingredient shape, traps left out
  cube('Kill Ledger Tier 1 Trap', ['Kill Ledger', 'gem3'], ['void']),
  cubeWith('Kill Ledger Tier 1', ['Kill Ledger', 'gem3'], ['useitem'], { mod: ['kill-ledger-tier-1', 1], condition: [3, 163, 500] }),
  cubeWith('Kill Ledger Tier 2', ['Kill Ledger', '"gem5,qty=2"'], ['useitem'], {
    mod: ['kill-ledger-tier-2', 1],
    condition: [3, 163, 5000],
  }),
  cube('Kill Ledger Lucion Whisper Trap', ['Kill Ledger', '"xl7,qty=2"'], ['void']),
  cubeWith('Kill Ledger Lucion Whisper', ['Kill Ledger', '"xl7,qty=2"'], ['useitem'], { condition: [6, 508, 50] }),
  cubeWith('Kill Ledger Diablo Hellhound', ['Kill Ledger', '"xly,qty=2"'], ['useitem'], { condition: [6, 508, 51] }),
  cubeWith('Kill Ledger Lucion', ['Kill Ledger', 'map', 'xly'], ['useitem'], { condition: [6, 508, 61] }),
  cube('Kill Ledger Trap All Recipes', ['Kill Ledger', 'any'], ['void']),
  // Ancient Scrolls: one generic row per recipe
  cube('Identify Scroll 1', ['01b', 'ddd'], ['01a']),
  cube('Identify Scroll 2', ['02b', 'ddd'], ['02a']),
  cube('Scroll Upgrade 1', ['"01a,qty=2"'], ['02a']),
  cube('Scroll Downgrade 2', ['02a'], ['01a']),
  cube('Scroll Reroll Low', ['rnd', '"asc1,qty=2"'], ['01a']),
  cube('Scroll Reroll Low', ['rnd', '"asc1,qty=2"'], ['02a']),
  // Unique charms and Maple Leaves
  cubeWith('Standard of Heroes Hellfire Torch', ['Hellfire Torch', 'std'], ['useitem'], { mod: ['item-upgraded', 1] }),
  cubeWith('Standard of Heroes Annihilus', ['Annihilus', 'std'], ['useitem'], { mod: ['item-upgraded', 1] }),
  cube('Unique Reroll ES Charm Exc', ['Yello Jello', '"gem5,qty=2"'], ['Yello Jello']),
  cube('Unique Reroll ES Charm Exc', ['Deviant Cell', '"gem5,qty=2"'], ['Deviant Cell']),
  cube('Maple Leaf: Unique Charm + Key + any rejuv pot', ['"char,uni"', 'key', 'rpot'], ['map', 'key']),
  cube('Orb of Anointment Recycle to Maple Leaf', ['um7', 'gem5'], ['map']),
  cube('Orb of Anointment Recycle to Maple Leaf x2', ['"um7,qty=2"', '"gem5,qty=2"'], ['map', 'map']),
  cube("[SECRET40] 10 Devil's Foods -> Maple Leaf", ['"dfc,qty=5"', '40a'], ['map', '40a']),
  // Class crafts (one row per class) and a Legacy craft, which is left out
  cube("magic helm + jewel + spider's silk + perfect emerald -> amazon helm", ['"helm,mag"', 'jewl', 'sss', 'ggb'], ['"usetype,crf"']),
  cube("magic boots + jewel + spider's silk + perfect emerald -> amazon boots", ['"boot,mag"', 'jewl', 'sss', 'ggb'], ['"usetype,crf"']),
  cube('magic helm + jewel + blackmoor + perfect obsidian -> warlock helm', ['"helm,mag"', 'jewl', 'eee', 'gbk'], ['"usetype,crf"']),
  cube('magic full helm + jewel + rune 06 + perfect amethyst -> hitpower helm', ['"helm,mag"', 'jewl', 'r03', 'gbk'], ['"usetype,crf"']),
  // Gem melding: the colours merged, one row per level requirement
  cubeWith('P-Eme + Any Wand + 3 ddd', ['wand', 'ggb', '"ddd,qty=3"'], ['useitem'], { mod: ['levelreq', 2] }),
  cubeWith('P-Obs + Any Wand + 3 ddd', ['wand', 'gbk', '"ddd,qty=3"'], ['useitem'], { mod: ['levelreq', 2] }),
  cubeWith('P-Eme + Any Weapon + 3 ddd', ['weap', 'ggb', '"ddd,qty=3"'], ['useitem'], { mod: ['levelreq', 2] }),
  cubeWith('P-Eme + Any Helm + 3 ddd', ['helm', 'ggb', '"ddd,qty=3"'], ['useitem'], { mod: ['levelreq', 3] }),
  // Ascendancies: the stones of one gem pattern pooled with their colours, the class rows merged, the tiers generic
  cube('Orb of Creation: 5 Orb of Elements', ['u11', 'u12'], ['u16']),
  cube(
    'Battlemage Ascendancy: Orb of Creation + 2 Blemished Sapphire + 2 Blemished Obsidian',
    ['u16', '"gpk,qty=2"', '"gpb,qty=2"'],
    ['Battlemage Ascendancy Stone']
  ),
  cube(
    'Nomad Ascendancy: Orb of Creation + 2 Blemished Obsidian + 2 Blemished Sapphire',
    ['u16', '"gpb,qty=2"', '"gpk,qty=2"'],
    ['Nomad Ascendancy Stone']
  ),
  cube('Berserker Ascendancy: Orb of Creation + 4 Blemished Obsidian', ['u16', '"gpk,qty=4"'], ['Berserker Ascendancy Stone']),
  cube('Battlemage Ascend to Tier 2 Trap', ['Battlemage Ascendancy Stone'], ['void']),
  cubeWith('Battlemage Ascend to Tier 2', ['Battlemage Ascendancy Stone'], ['useitem'], { mod: ['ascendancy-tier-2', 1] }),
  cubeWith('Nomad Ascend to Tier 2', ['Nomad Ascendancy Stone'], ['useitem'], { mod: ['ascendancy-tier-2', 1] }),
  cubeWith('Nomad Ascend to Tier 3', ['Nomad Ascendancy Stone', 'map'], ['useitem'], { mod: ['ascendancy-tier-3', 1] }),
  // Vessel of Souls: every weapon one row; the trap rows are left out
  cube('Vessel of Souls Transform to Mythical Razor Axe Anoint Trap', ['Vessel of Souls', 'gpk', 'gpb', 'gpw'], ['void']),
  cube('Vessel of Souls Transform to Mythical Razor Axe', ['Vessel of Souls', 'gpk', 'gpb', 'gpw'], ['"m21,mod"']),
  cube('Vessel of Souls Transform to Mythical Shade Bow', ['Vessel of Souls', 'gpk', 'gpb', 'gpv'], ['"m24,mod"']),
  ...FILLER,
]);

const MISC = tsv([
  ['name', 'code', 'namestr', 'type'],
  ['Dragon Stone', 'ppp', 'ppp'],
  ['Holy Symbol', 'hly', 'hly'],
  ['Anvil Stone', 'qqq', 'qqq'],
  ['Thawing Potion', 'wms', 'wms'],
  ['Chipped Emerald', 'gcg', 'gcg'],
  ['Chipped Sapphire', 'gcb', 'gcb'],
  ['Ring', 'ring', 'ring'],
  ["Starter's Pack", 'ag8', 'ag8'],
  ['Coupon Wild Card', '99j', '99j'],
  ['Multi Stocker', 't70', 'can8', 'can8'],
  ['Multi Stocker', 't71', 'can8', 'can8'],
  ['Randomize Stone', 'rnd', 'rnd'],
  ['Coupon nor Armor 1', '01c', '01c', 'cpn1'],
  ['Coupon nor Armor 2', '02c', '02c', 'cpn1'],
  ['Inarius Everburning Halo', 'u40', 'u40'],
  ['Skeleton Key', 'key', 'key'],
  ['Maple Leaf', 'map', 'map'],
  ['Chipped Topaz', 'gcy', 'gcy'],
  ['Scroll of Town Portal', 'tsc', 'tsc'],
  ['Scroll of Identify', 'isc', 'isc'],
  ['I Rune', 'r01', 'r01'],
  ['U Rune', 'r02', 'r02'],
  ['Shi Rune', 'r03', 'r03'],
  ['Null Rune', 'r50', 'r50'],
  ['El Rune', 'r51', 'r51'],
  ['Eld Rune', 'r52', 'r52'],
  ['Tir Rune', 'r53', 'r53'],
  ['Moon Rune', 'r84', 'r84'],
  ['Full Rejuv Potion', 'rvl', 'rvl'],
  ['Ancient Decal (I -> El)', '01l', '01l'],
  ['Ancient Decal (Shi -> Eld)', '02l', '02l'],
  ['Ancient Decal (Ka -> Tir)', '03l', '03l'],
  ['Frozen Soul', 'xt0', 'xt0'],
  ['Crystal Can', 'can9', 'can9'],
  ['Key of Terror', 'pk1', 'pk1'],
  ['Key of Hate', 'pk2', 'pk2'],
  ['Key of Destruction', 'pk3', 'pk3'],
  ['Pandemonium Key Set', 'u10', 'u10'],
  ["Diablo's Horn", 'dhn', 'dhn'],
  ["Baal's Eye", 'bey', 'bey'],
  ["Mephisto's Brain", 'mbr', 'mbr'],
  ['Heart', 'hrt', 'hrt'],
  ['Fang', 'fng', 'fng'],
  ['Perfect Obsidian', 'gbk', 'gbk'],
  ['Perfect Ruby', 'grb', 'grb'],
  ['Perfect Emerald', 'ggb', 'ggb'],
  ['Antidote Potion', 'yps', 'yps'],
  ['Weapon Mastery Token', 'u23', 'u23'],
  ['Weapon Mastery Token Stag Bow', 'u24', 'u24'],
  ['Weapon Mastery Token Wand', 'u25', 'u25'],
  ['Stag Bow', 'am1', 'am1'],
  ['Wand', 'wnd', 'wnd'],
  ["Spider'sSilk", 'sss', 'sss'],
  ['Blackmoor', 'eee', 'eee'],
  ["Lucion's Essence", 'u17', 'u17'],
  ['Flawed Enigmatic Cinnabar', 'xl7', 'xl7'],
  ['Flawed Tainted Tourmaline', 'xly', 'xly'],
  ['UnID Scroll 1', '01b', '01b'],
  ['UnID Scroll 2', '02b', '02b'],
  ['Scroll 1', '01a', '01a', 'asc1'],
  ['Scroll 2', '02a', '02a', 'asc1'],
  ['Scroll 40', '40a', '40a'],
  ['Decipherer', 'ddd', 'ddd'],
  ['Standard of Heroes', 'std', 'std'],
  ['Orb of Anointment', 'um7', 'um7'],
  ["Devil's Food", 'dfc', 'dfc'],
  ['Orb of Storms', 'u11', 'u11'],
  ['Orb of Earth', 'u12', 'u12'],
  ['Orb of Creation', 'u16', 'u16'],
  ['Blemished Obsidian', 'gpk', 'gpk'],
  ['Blemished Sapphire', 'gpb', 'gpb'],
  ['Blemished Diamond', 'gpw', 'gpw'],
  ['Blemished Amethyst', 'gpv', 'gpv'],
  ['Mythical Razor Axe', 'm21', 'm21'],
  ['Mythical Shade Bow', 'm24', 'm24'],
]);

const FAMILY_STRINGS = JSON.stringify([
  ...(JSON.parse(STRINGS) as object[]),
  { Key: 'wms', enUS: '*Thaw' },
  { Key: '99j', enUS: '(Wild Card)\nAncient Coupon' },
  { Key: 'can8', enUS: 'Multi Stocker' },
  { Key: 'rnd', enUS: 'Randomizing Stone' },
  { Key: '01c', enUS: '(Buckler, Pelta Lunata)\nAncient Coupon' },
  { Key: '02c', enUS: "(Cap, Biggin's Bonnet)\nAncient Coupon" },
  { Key: 'u40', enUS: "Inarius' Everburning Halo" },
  { Key: 'u24', enUS: 'Awakened Weapon Mastery Token' },
  { Key: 'u25', enUS: 'Awakened Weapon Mastery Token' },
  { Key: 'sss', enUS: "Spider's Silk" },
  { Key: '01b', enUS: 'Ancient Scroll' },
  { Key: '02b', enUS: 'Ancient Scroll' },
  { Key: '01a', enUS: 'Ancient Scroll 1' },
  { Key: '02a', enUS: 'Ancient Scroll 2' },
  { Key: '40a', enUS: 'Ancient Scroll 40' },
  { Key: 'ddd', enUS: 'Ancient Decipherer' },
  { Key: 'rpot', enUS: 'Rejuv Potion' },
]);

function esr(): EsrGuideTables {
  return buildEsrGuideTables({
    tables: { cubemain: CUBEMAIN, misc: MISC, armor: ARMOR, weapons: WEAPONS, itemtypes: ITEMTYPES, difficultylevels: DIFFICULTYLEVELS },
    strings: [{ name: 'item-names.json', text: FAMILY_STRINGS }],
  });
}

function family(id: string): CubeFamily {
  const found = findCubeFamily(id);
  if (found === undefined) throw new Error(`no family ${id}`);
  return found;
}

describe('cube families', () => {
  it('has unique ids', () => {
    const ids = CUBE_FAMILIES.map((candidate) => candidate.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists each distinct recipe once in file order, merging repeated outputs', () => {
    expect(collectFamily(family('dstone-cycle'), esr())).toEqual([
      { inputs: ['Dragon Stone'], output: 'Holy Symbol', note: null },
      { inputs: ['Holy Symbol'], output: 'Dragon Stone', note: null },
    ]);
    // Per-class duplicates collapse to one row
    expect(collectFamily(family('starter-pack'), esr())).toEqual([{ inputs: ['Starter Pack'], output: 'Anvil Stone', note: null }]);
  });

  it('collapses by the family key and names abbreviated potions by their full name', () => {
    expect(collectFamily(family('skill-forging'), esr())).toEqual([
      {
        inputs: ['Weapon (no runeword) / Ring', '2× Anvil Stone', 'Chipped Emerald'],
        output: 'The same item (+Amazon skills)',
        note: null,
      },
      { inputs: ['Weapon (no runeword)', '2× Anvil Stone', 'Chipped Sapphire'], output: 'The same item (+Sorceress skills)', note: null },
    ]);
    expect(collectFamily(family('remove-forging'), esr())).toEqual([
      {
        inputs: ['Weapon (no runeword)', '3× Thawing Potion'],
        output: 'The same item + 2× Anvil Stone',
        note: null,
      },
    ]);
  });

  it('leaves out returned items and shows no txt descriptions', () => {
    expect(collectFamily(family('anvil-stone'), esr())).toEqual([
      { inputs: ['4× Dragon Stone'], output: 'Anvil Stone', note: null },
      { inputs: ['Multi Stocker', 'Skeleton Key'], output: 'The same item + Anvil Stone', note: null },
    ]);
  });

  it('makes the per-unique coupon rows generic and keeps the Wild Card trade apart', () => {
    expect(collectFamily(family('coupon-tiers'), esr())).toEqual([
      { inputs: ['8× normal coupons (any)'], output: 'Ancient Coupon (Wild Card)', note: null },
      { inputs: ['3× matching coupons (any tier)'], output: 'The LoD unique named on the coupons', note: null },
      { inputs: ['2× matching normal coupons', '1 Wild Card'], output: 'The LoD unique named on the coupons', note: null },
      { inputs: ['Randomizing Stone', '3× normal coupons (any)'], output: 'A random normal coupon', note: null },
    ]);
  });

  it('shows a cloned item as a copy with its mods next to the original, and a type by the one name its items share', () => {
    expect(collectFamily(family('legendary-consumables'), esr())).toEqual([
      {
        inputs: ['Ring / Multi Stocker', "Inarius' Everburning Halo"],
        output: 'The same item + A copy of the item (Branded)',
        note: null,
      },
    ]);
  });

  it('shows stat and all skills forging on equipment of any quality as one row, jewels apart', () => {
    expect(collectFamily(family('stat-forging'), esr())).toEqual([
      {
        inputs: ['Equipment of any quality (no runeword)', 'Anvil Stone', 'Chipped Emerald / Chipped Sapphire'],
        output: 'The same item',
        note: null,
      },
      { inputs: ['Jewel', 'Anvil Stone', 'Chipped Emerald'], output: 'The same item', note: null },
    ]);
    expect(collectFamily(family('all-skill-forging'), esr())).toEqual([
      {
        inputs: ['Equipment of any quality (no runeword)', 'Maple Leaf', 'Anvil Stone', 'Chipped Gem'],
        output: 'The same item',
        note: null,
      },
    ]);
  });

  it('merges the per-rune forging rows per slot, naming the runes as ranges, and leaves out the bonus overrides', () => {
    expect(collectFamily(family('rune-forging'), esr())).toEqual([
      {
        inputs: ['Jewel', '2× the same rune (I Rune)', 'Chipped Gem', 'Scroll of Town Portal / Scroll of Identify'],
        output: 'The same item',
        note: null,
      },
      {
        inputs: ['Weapon (no runeword) / Any Armor (no runeword)', '2× the same rune (I Rune to Shi Rune, Moon Rune)', 'Chipped Gem'],
        output: 'The same item',
        note: null,
      },
    ]);
  });

  it('shows rune conversions generically, checks the Decal pairs against their names and keeps Crystal Can rows out', () => {
    expect(collectFamily(family('rune-conversion'), esr())).toEqual([
      { inputs: ['2× the same rune (I Rune to U Rune, El Rune)'], output: 'The next rune', note: null },
      { inputs: ['Shi Rune', 'Full Rejuv Potion'], output: 'Null Rune', note: null },
      { inputs: ['Null Rune', 'Full Rejuv Potion'], output: 'Shi Rune', note: null },
      { inputs: ['A rune (U Rune to Shi Rune)'], output: 'The rune one grade lower', note: null },
      {
        inputs: ['Ancient Decal (X -> Y)', 'X Rune (the ES rune named on the Decal)'],
        output: 'Y Rune (an LoD rune)',
        note: null,
      },
      // A Decal whose name does not match its row is shown as it is
      { inputs: ['Ancient Decal (Ka -> Tir)', 'U Rune'], output: 'Tir Rune', note: null },
      { inputs: ['An LoD rune (El Rune to Eld Rune)'], output: 'The ES rune and the Ancient Decal named after it', note: null },
      { inputs: ['Null Rune', 'Frozen Soul'], output: 'Moon Rune', note: null },
    ]);
  });

  it('lists tinkering once per organ', () => {
    expect(collectFamily(family('tinkering'), esr())).toEqual([
      { inputs: ['Weapon (no runeword) / Any Armor (no runeword)', '3× Heart'], output: 'The same item', note: null },
      { inputs: ['Weapon (no runeword) / Any Armor (no runeword)', 'Fang'], output: 'The same item', note: null },
    ]);
  });

  it('lists the Pandemonium key recipes', () => {
    expect(collectFamily(family('uber-keys'), esr())).toEqual([
      { inputs: ['Key of Terror', 'Blemished Gem', 'Thawing Potion'], output: 'Key of Destruction', note: null },
      { inputs: ['Pandemonium Key Set'], output: 'Key of Terror + Key of Hate + Key of Destruction', note: null },
      { inputs: ['Key of Terror', 'Key of Hate', 'Key of Destruction', 'Skeleton Key'], output: 'Pandemonium Key Set', note: null },
      { inputs: ["Diablo's Horn", "Baal's Eye", "Mephisto's Brain"], output: 'Pandemonium Finale Portal', note: null },
    ]);
  });

  it('shows Merc Only Conversion as one row to apply and one to remove, the slots and gem colours merged', () => {
    expect(collectFamily(family('merc-only'), esr())).toEqual([
      {
        inputs: ['Weapon or armor (no runeword)', 'Anvil Stone', 'Perfect Gem (the colour picks the bonus)'],
        output: 'The same item (mercenary only)',
        note: null,
      },
      {
        inputs: ['Weapon or armor (no runeword)', '3× Antidote Potion'],
        output: 'The same item (no longer mercenary only) + Anvil Stone + the Perfect Gem',
        note: null,
      },
    ]);
  });

  it('shows each weapon mastery step once, the bases merged, and what removing it loses', () => {
    expect(collectFamily(family('weapon-mastery'), esr())).toEqual([
      {
        inputs: ['A class weapon (any of 2 bases)', 'Weapon Mastery Token'],
        output: 'The same weapon + Awakened Weapon Mastery Token (for that weapon type)',
        note: null,
      },
      { inputs: ['Awakened Weapon Mastery Token'], output: 'Weapon Mastery Token', note: null },
      {
        inputs: ['The class weapon (no runeword)', 'Awakened Weapon Mastery Token', "Its class's Dragon Stone form", 'Anvil Stone'],
        output: 'The same weapon with its mastery',
        note: null,
      },
      {
        inputs: ['The class weapon (no runeword)', "Its class's Dragon Stone form", '3× Thawing Potion'],
        output: 'The same weapon without the mastery (the token is not returned)',
        note: null,
      },
    ]);
  });

  it('lists the Key unsocketing as one row and leaves the trap out', () => {
    expect(collectFamily(family('unsocket'), esr())).toEqual([
      {
        inputs: ['Any socketed weapon or charm', 'Skeleton Key'],
        output: 'The same item with empty sockets + everything that was socketed in it',
        note: null,
      },
    ]);
  });

  it("merges Lucion's Essence rows per quality and socket count, socketed and unsocketed items alike", () => {
    expect(collectFamily(family('lucion-essence'), esr())).toEqual([
      {
        inputs: ['Magic weapon or armor', "Lucion's Essence"],
        output: 'The same item with 4 sockets (anything socketed in it comes out)',
        note: null,
      },
      { inputs: ['Rare boots / Unique weapon', "Lucion's Essence"], output: 'The same item with 2 sockets', note: null },
    ]);
  });

  it('shows the Kill Ledger kill counts from the row conditions and groups the boss rows, without traps', () => {
    expect(collectFamily(family('kill-ledger-tiers'), esr())).toEqual([
      { inputs: ['Kill Ledger (at least 500 kills)', 'Flawless Gem'], output: 'The Kill Ledger with kill bonus 1', note: null },
      { inputs: ['Kill Ledger (at least 5,000 kills)', '2× Perfect Gem'], output: 'The Kill Ledger with kill bonus 2', note: null },
    ]);
    expect(collectFamily(family('kill-ledger-bosses'), esr())).toEqual([
      {
        inputs: ['Kill Ledger', '2× Flawed Enigmatic Cinnabar / 2× Flawed Tainted Tourmaline'],
        output: "The Kill Ledger with that boss's bonus",
        note: null,
      },
      { inputs: ['Kill Ledger', 'Maple Leaf', 'Flawed Tainted Tourmaline'], output: "The Kill Ledger with that boss's bonus", note: null },
    ]);
  });

  it('shows one generic row per Ancient Scroll recipe with the scroll numbers read from the rows', () => {
    expect(collectFamily(family('ancient-scrolls'), esr())).toEqual([
      { inputs: ['Ancient Scroll (unidentified)', 'Ancient Decipherer'], output: 'Ancient Scroll N (its number, 1 to 2)', note: null },
      { inputs: ['2× Ancient Scroll N (N = 1)'], output: 'Ancient Scroll N+1', note: null },
      { inputs: ['Ancient Scroll N (N = 2)'], output: 'Ancient Scroll N-1', note: null },
      { inputs: ['Randomizing Stone', '2× Ancient Scroll (any of 1 to 2)'], output: 'A random Ancient Scroll 1 to 2', note: null },
    ]);
  });

  it('merges the unique charm upgrades and rerolls and the Orb of Anointment batches', () => {
    expect(collectFamily(family('unique-charm-upgrades'), esr())).toEqual([
      { inputs: ['Hellfire Torch / Annihilus', 'Standard of Heroes'], output: 'The same charm (upgraded)', note: null },
      { inputs: ['Yello Jello / Deviant Cell', '2× Perfect Gem'], output: 'The same charm, rerolled', note: null },
      { inputs: ['Unique Charm', 'Skeleton Key', 'Rejuv Potion'], output: 'Maple Leaf', note: null },
    ]);
    expect(collectFamily(family('maple-leaf'), esr())).toEqual([
      { inputs: ['Unique Charm', 'Skeleton Key', 'Rejuv Potion'], output: 'Maple Leaf', note: null },
      { inputs: ['N× Orb of Anointment (N = 1 to 2)', 'N× Perfect Gem'], output: 'N× Maple Leaf', note: null },
      { inputs: ["5× Devil's Food", 'Ancient Scroll 40'], output: 'Maple Leaf', note: null },
    ]);
  });

  it('shows one class craft row per class and leaves the Legacy crafts out', () => {
    expect(collectFamily(family('class-craft'), esr())).toEqual([
      {
        inputs: ['Magic item (any slot)', 'Jewel', "Spider's Silk", 'Perfect Emerald'],
        output: 'Crafted item of the same type (Amazon craft)',
        note: null,
      },
      {
        inputs: ['Magic item (any slot)', 'Jewel', 'Blackmoor', 'Perfect Obsidian'],
        output: 'Crafted item of the same type (Warlock craft)',
        note: null,
      },
    ]);
  });

  it('merges gem melding per level requirement, the gem colours merged', () => {
    expect(collectFamily(family('gem-meld'), esr())).toEqual([
      {
        inputs: ['Wand, Staff or Orb / Weapon', 'Perfect Gem (the colour picks the bonus)', '3× Ancient Decipherer'],
        output: 'The same item (+2 level requirement)',
        note: null,
      },
      {
        inputs: ['Helm', 'Perfect Gem (the colour picks the bonus)', '3× Ancient Decipherer'],
        output: 'The same item (+3 level requirement)',
        note: null,
      },
    ]);
  });

  it('pools the Ascendancy Stones of one gem pattern with their colours and shows the tiers for any stone', () => {
    expect(collectFamily(family('ascendancy'), esr())).toEqual([
      { inputs: ['Orb of Storms', 'Orb of Earth'], output: 'Orb of Creation', note: null },
      {
        inputs: ['Orb of Creation', '2× Blemished gems + 2× Blemished gems of another colour'],
        output: 'Ascendancy Stone: Battlemage (Obsidian, Sapphire) / Nomad (Sapphire, Obsidian)',
        note: null,
      },
      { inputs: ['Orb of Creation', '4× Blemished gems of one colour'], output: 'Ascendancy Stone: Berserker (Obsidian)', note: null },
      { inputs: ['Your Ascendancy Stone'], output: 'The stone at tier 2', note: null },
      { inputs: ['Your Ascendancy Stone', 'Maple Leaf'], output: 'The stone at tier 3', note: null },
    ]);
  });

  it('shows every Vessel of Souls transformation as one row and leaves the traps out', () => {
    expect(collectFamily(family('vessel-transform'), esr())).toEqual([
      {
        inputs: ['Vessel of Souls', '3 Blemished gems of different colours (they pick the weapon)'],
        output: 'Mythical Razor Axe / Mythical Shade Bow, each keeps its stats',
        note: null,
      },
    ]);
  });

  it('caps a block at MAX_FAMILY_ROWS rows and counts the rest in the caption', () => {
    const many: CubeFamily = { id: 'many', label: 'Many', match: /^Filler / };
    const block = familyBlock(many, esr());
    expect(block.rows).toHaveLength(MAX_FAMILY_ROWS);
    expect(block.rows[0]).toEqual({ inputs: ['Dragon Stone'], output: 'Holy Symbol', note: null });
    expect(block.caption).toBe('Many (… and 2 more)');
  });
});

describe('clusterVariants', () => {
  it('pools outputs of identical inputs, merges one differing slot and keeps everything else apart', () => {
    expect(
      clusterVariants([
        { inputs: ['A', 'Gem'], output: 'X' },
        { inputs: ['B', 'Gem'], output: 'X' },
        { inputs: ['C', 'Gem'], output: 'Y' },
        { inputs: ['C', 'Gem'], output: 'Z' },
        { inputs: ['C', 'Gem'], output: 'Z' },
        { inputs: ['D', 'Rune'], output: 'X' },
      ])
    ).toEqual([
      { inputs: ['A / B', 'Gem'], output: 'X' },
      { inputs: ['C', 'Gem'], output: 'Z / Y' },
      { inputs: ['D', 'Rune'], output: 'X' },
    ]);
  });

  it('caps a merged group at MAX_GROUP_ROWS rows', () => {
    const rows = capGroup(
      ['a', 'b', 'c', 'd', 'e'].map((input) => ({ inputs: [input], output: input })),
      () => null
    );
    expect(rows).toHaveLength(MAX_GROUP_ROWS);
    expect(rows.at(-1)?.note).toBe('… and 2 more');
  });
});

describe('::recipes', () => {
  const resolve = LEAF_DIRECTIVES.recipes;
  const ctx = fixtureContext({ esr: esr() });

  it('resolves a family to a recipes block captioned with its label', () => {
    expect(resolve('dstone-cycle', ctx)).toEqual({
      kind: 'recipes',
      caption: family('dstone-cycle').label,
      rows: collectFamily(family('dstone-cycle'), esr()),
    });
  });

  it('fails for a missing or unknown id (listing the ids), an empty family and a missing clone', () => {
    expect(resolve(null, ctx)).toHaveProperty('error', expect.stringContaining('dstone-cycle, anvil-stone'));
    expect(resolve('nope', ctx)).toHaveProperty(
      'error',
      expect.stringMatching(/^::recipes\[nope\]: unknown recipe family \(known: dstone-cycle, /)
    );
    expect(resolve('map-upgrade', ctx)).toHaveProperty('error', expect.stringContaining('no cubemain.txt row matches'));
    expect(resolve('dstone-cycle', fixtureContext({ esr: null }))).toEqual({
      error: '::recipes needs the ESR clone (not found; pass --esr <dir>)',
    });
  });

  it('keys the block by its directive in a note', () => {
    const result = markdownToBlocks('::recipes[dstone-cycle]', ctx, 'notes/test.md');
    expect(result.errors).toEqual([]);
    expect(result.dataBlocks.map((block) => block.key)).toEqual(['recipes:dstone-cycle']);
  });
});

describe.skipIf(!existsSync(ESR_DIR))('cube families against the ESR clone', () => {
  const tables = existsSync(ESR_DIR) ? buildEsrGuideTables(readEsrGuideSources(ESR_DIR)) : null;

  it.each(CUBE_FAMILIES.map((candidate) => [candidate.id, candidate] as const))('%s matches at least one row', (_, candidate) => {
    if (tables === null) return;
    expect(familyRows(candidate, tables).length).toBeGreaterThan(0);
    expect(familyBlock(candidate, tables).rows.length).toBeGreaterThan(0);
  });
});
