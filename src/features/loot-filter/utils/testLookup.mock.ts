import type { LootFilterDataBundle, TypesBundle } from '@/features/game-data/engine/schema';
import { buildLookup } from './lookup';

const type = (code: string, name: string, parents: string[] = []): TypesBundle['types'][number] => ({
  code,
  name,
  parents,
  ancestors: [code, ...parents],
  sockets: [0, 0, 0],
  thresholds: [25, 40],
  cls: null,
  ui: null,
  rwCats: [],
  magic: false,
  rare: false,
  normal: false,
  bodyLoc: null,
});

export const TEST_DATA: LootFilterDataBundle = {
  items: [
    { code: 'r33', name: 'Zod Rune', kind: 'misc', type: 'rune', spawnable: true, drops: true },
    { code: 'r32', name: 'Cham Rune', kind: 'misc', type: 'rune', spawnable: true, drops: true },
    { code: 'r31', name: 'Jah Rune', kind: 'misc', type: 'rune', spawnable: true, drops: true },
    { code: 'hax', name: 'Hand Axe', kind: 'weapon', type: 'axe', spawnable: true, drops: true },
    { code: 'xyz', name: 'Shadow Axe', kind: 'weapon', type: 'axe', spawnable: false, drops: false },
  ],
  stats: [
    { id: 0, name: 'strength' },
    { id: 194, name: 'item_numsockets' },
    { id: 300, name: '' },
  ],
  areas: [
    { id: 1, name: 'Rogue Encampment', act: 0 },
    { id: 40, name: 'Lut Gholein', act: 1 },
    { id: 2, name: 'Blood Moor', act: 0 },
  ],
  sounds: [''],
  uniques: [
    { id: 0, name: 'The Gnasher', code: 'hax' },
    { id: 5, name: 'Harlequin Crest', code: 'uap' },
  ],
  sets: [{ id: 5, name: "Civerb's Ward", code: 'lrg' }],
};

export const TEST_TYPES: TypesBundle = {
  types: [type('rune', 'Rune', ['misc']), type('axe', 'Axe', ['weap']), type('weap', 'Weapon'), type('misc', 'Miscellaneous')],
  classes: [],
};

export const TEST_LOOKUP = buildLookup(TEST_DATA, TEST_TYPES);
