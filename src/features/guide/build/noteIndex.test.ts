import { describe, expect, it } from 'vitest';
import type { DataBlock } from '../engine/schema.ts';
import type { NoteDataBlock } from './markdown.ts';
import { buildNoteIndex } from './noteIndex.ts';
import { fixtureContext } from './testContext.mock.ts';

const RECIPES: DataBlock = { kind: 'recipes', caption: 'x', rows: [] };
const source = (item: string): DataBlock => ({ kind: 'source', item, labels: [] });
const card = (item: 'socketable' | 'unique', name: string): DataBlock => ({ kind: 'card', item, name, href: '' });

function block(key: string, directive: string, arg: string | null, data: DataBlock): NoteDataBlock {
  return { key, directive, arg, block: data };
}

const notes = [
  {
    slug: 'dragon-stones',
    dataBlocks: [
      block('recipes:dstone-cycle', 'recipes', 'dstone-cycle', RECIPES),
      block('source:Anvil Stone', 'source', 'Anvil Stone', source('Anvil Stone')),
    ],
  },
  {
    slug: 'secrets',
    dataBlocks: [block('secret-recipe:50', 'secret-recipe', '50', RECIPES), block('secret-recipes', 'secret-recipes', null, RECIPES)],
  },
  {
    slug: 'shards',
    dataBlocks: [
      block('source:Worldstone Shard{item=set}', 'source', 'Worldstone Shard', source('Worldstone Shard')),
      block('source:Worldstone Shard{item=misc}', 'source', 'Worldstone Shard', source('Worldstone Shard')),
      block('source:Annihilus', 'source', 'Annihilus', source('Annihilus')),
    ],
  },
  {
    slug: 'runes',
    dataBlocks: [
      block('card:socketable:El Rune', 'card', 'socketable:El Rune', card('socketable', 'el rune')),
      block('card:unique:Annihilus', 'card', 'unique:Annihilus', card('unique', 'Annihilus')),
    ],
  },
  { slug: 'starter-pack', dataBlocks: [block("recipe-output:Adventurer's Pack", 'recipe-output', "Adventurer's Pack", RECIPES)] },
  { slug: 'more-dragon-stones', dataBlocks: [block('recipes:dstone-cycle', 'recipes', 'dstone-cycle', RECIPES)] },
];

describe('buildNoteIndex', () => {
  const { familyNotes, itemNotes } = buildNoteIndex(notes, fixtureContext());

  it('maps recipe families (secret recipes to `secret`) to the notes showing them, sorted', () => {
    expect(familyNotes['dstone-cycle']).toEqual(['dragon-stones', 'more-dragon-stones']);
    expect(familyNotes.secret).toEqual(['secrets']);
  });

  it('maps misc sources, socketable cards and recipe-output inputs to item codes; other kinds are skipped', () => {
    expect(itemNotes).toEqual({
      ag8: ['starter-pack'],
      qqq: ['dragon-stones'],
      r51: ['runes'],
      xa1: ['shards'],
    });
  });

  it('maps a recipe-output to the family of its rows', () => {
    expect(Object.entries(familyNotes).filter(([, slugs]) => slugs.includes('starter-pack'))).toHaveLength(1);
  });

  it('keeps families without the ESR clone and skips recipe-output', () => {
    const index = buildNoteIndex(notes, fixtureContext({ esr: null }));
    expect(index.familyNotes['dstone-cycle']).toEqual(['dragon-stones', 'more-dragon-stones']);
    expect(index.itemNotes).toEqual({ qqq: ['dragon-stones'], r51: ['runes'], xa1: ['shards'] });
  });
});
