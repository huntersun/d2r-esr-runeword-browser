import { describe, it, expect } from 'vitest';
import {
  htmRunewordId,
  matchRunewords,
  normalizeIngredient,
  normalizeName,
  rowsForSockets,
  type HtmRunewordLike,
} from './matchRunewords.ts';
import type { TxtRuneword, TxtRunewordRow, TxtRunewordsBundle } from './schema.ts';

function row(ingredients: string[], extra: Partial<TxtRunewordRow> = {}): TxtRunewordRow {
  const jewels = extra.jewels ?? 0;
  return {
    ingredients,
    codes: [],
    jewels,
    sockets: ingredients.length + jewels,
    itypes: ['weap'],
    etypes: [],
    reqLvl: 1,
    text: [],
    ...extra,
  };
}

const txtRw = (key: string, name: string, rows: TxtRunewordRow[]): TxtRuneword => ({ key, name, rows });
const bundle = (...runewords: TxtRuneword[]): TxtRunewordsBundle => ({ runewords });
const htmRw = (name: string, variant: number, ingredients: string[], extra: Partial<HtmRunewordLike> = {}): HtmRunewordLike => ({
  name,
  variant,
  sockets: ingredients.length,
  ingredients,
  ...extra,
});

describe('normalizeName / normalizeIngredient', () => {
  it('strips colour codes, unifies apostrophes, lowercases and collapses whitespace', () => {
    expect(normalizeName('ÿc4Heaven’s   Light ')).toBe("heaven's light");
    expect(normalizeName('Heaven`s Light')).toBe("heaven's light");
    expect(normalizeName('Pokémon')).toBe('pokemon');
  });

  it('removes a trailing rune/gem suffix from ingredients only', () => {
    expect(normalizeIngredient('Eth Rune')).toBe('eth');
    expect(normalizeIngredient('eth')).toBe('eth');
    expect(normalizeIngredient('Perfect Ruby')).toBe('perfect ruby');
    expect(normalizeName('Eth Rune')).toBe('eth rune');
  });
});

describe('matchRunewords', () => {
  it('pass 1: matches name and ordered ingredients exactly', () => {
    const txt = bundle(txtRw('Runeword1', 'Stone', [row(['I Rune', 'Shi Rune'])]));
    const result = matchRunewords([htmRw('Stone', 1, ['I Rune', 'Shi Rune'])], txt);
    expect(result.byHtm.get('Stone::1')).toMatchObject({ key: 'Runeword1', keys: ['Runeword1'], quality: 'exact' });
    expect(result.unmatchedHtm).toEqual([]);
    expect(result.unmatchedTxt).toEqual([]);
  });

  it('pass 2: matches the same ingredient multiset in a different order', () => {
    const txt = bundle(txtRw('Runeword1', 'Stone', [row(['Shi Rune', 'I Rune'])]));
    const result = matchRunewords([htmRw('Stone', 1, ['I Rune', 'Shi Rune'])], txt);
    expect(result.byHtm.get('Stone::1')?.quality).toBe('multiset');
  });

  it('pass 3: matches a name that is unique on both sides even when the recipe differs', () => {
    const txt = bundle(txtRw('Runeword1', 'Stone', [row(['Ka Rune'])]));
    const result = matchRunewords([htmRw('Stone', 1, ['I Rune', 'Shi Rune'])], txt);
    expect(result.byHtm.get('Stone::1')?.quality).toBe('name-only');
  });

  it('leaves differing recipes of a shared name unmatched on both sides', () => {
    const txt = bundle(txtRw('Runeword1', 'Stone', [row(['Ka Rune'])]), txtRw('Runeword2', 'Stone', [row(['N Rune'])]));
    const result = matchRunewords([htmRw('Stone', 1, ['I Rune'])], txt);
    expect(result.byHtm.size).toBe(0);
    expect(result.unmatchedHtm.map(htmRunewordId)).toEqual(['Stone::1']);
    expect(result.unmatchedTxt.map((rw) => rw.key)).toEqual(['Runeword1', 'Runeword2']);
  });

  it('resolves name collisions (Rain ×5) by recipe', () => {
    const txt = bundle(
      txtRw('Runeword1', 'Rain', [row(['A Rune', 'Me Rune'])]),
      txtRw('Runeword2', 'Rain', [row(['Ort Rune', 'Mal Rune', 'Ith Rune'])])
    );
    const result = matchRunewords([htmRw('Rain', 1, ['A Rune', 'Me Rune']), htmRw('Rain', 2, ['Ort Rune', 'Mal Rune', 'Ith Rune'])], txt);
    expect(result.byHtm.get('Rain::1')?.key).toBe('Runeword1');
    expect(result.byHtm.get('Rain::2')?.key).toBe('Runeword2');
  });

  it('compares Ko Rune by display name (r19 and r68 resolve to the same name)', () => {
    const txt = bundle(txtRw('Runeword1', 'Moonlight', [row(['Moon Rune', 'Ko Rune', 'U Rune'], { codes: ['r84', 'r68', 'r02'] })]));
    const result = matchRunewords([htmRw('Moonlight', 1, ['Moon Rune', 'Ko Rune', 'U Rune'])], txt);
    expect(result.byHtm.get('Moonlight::1')?.quality).toBe('exact');
  });

  it('normalises apostrophes, colour codes and the rune suffix on both sides', () => {
    const txt = bundle(txtRw('Runeword1', 'Heaven’s Will', [row(['ÿc9Eth Rune', 'Ko'])]));
    const result = matchRunewords([htmRw("Heaven's Will", 1, ['Eth', 'Ko Rune'])], txt);
    expect(result.byHtm.get("Heaven's Will::1")?.quality).toBe('exact');
  });

  it('falls back to runes when ingredients are absent', () => {
    const txt = bundle(txtRw('Runeword1', 'Boar', [row(['I Rune'])]));
    const result = matchRunewords([{ name: 'Boar', variant: 1, sockets: 1, runes: ['I Rune'] }], txt);
    expect(result.byHtm.get('Boar::1')?.quality).toBe('exact');
  });

  it('matches every per-socket HTM row to the key holding all socket rows', () => {
    const rows = [
      row(['Death Rune', 'God Rune']),
      row(['Death Rune', 'God Rune'], { jewels: 1 }),
      row(['Death Rune', 'God Rune'], { jewels: 2 }),
    ];
    const txt = bundle(txtRw('Runeword1', 'Shinigami', rows));
    const ranged = htmRw('Shinigami', 1, ['Death Rune', 'God Rune'], { socketsMax: 4 });
    const fixed = htmRw('Shinigami', 2, ['Death Rune', 'God Rune'], { sockets: 3 });
    const result = matchRunewords([ranged, fixed], txt);
    const match = result.byHtm.get('Shinigami::2');
    expect(match?.rows).toHaveLength(3);
    expect(rowsForSockets(match?.rows ?? [], fixed).map((r) => r.sockets)).toEqual([3]);
    expect(rowsForSockets(match?.rows ?? [], ranged).map((r) => r.sockets)).toEqual([2, 3, 4]);
  });

  describe('keys sharing a name and recipe', () => {
    const recipe = ['A Rune', 'Me Rune'];
    const txt = bundle(
      txtRw('Runeword1', 'Rain', [row(recipe, { itypes: ['wand', 'knif'] })]),
      txtRw('Runeword2', 'Rain', [row(recipe, { itypes: ['tors'] })]),
      txtRw('Runeword3', 'Rain', [row(recipe, { itypes: ['staf'], etypes: ['orb'] })]),
      txtRw('Runeword4', 'Rain', [row(recipe, { itypes: ['helm'] })])
    );
    const typeNames = new Map([
      ['wand', 'Wand'],
      ['knif', 'Knife'],
      ['tors', 'Armor'],
      ['staf', 'Staff'],
      ['orb', 'Orb'],
      ['helm', 'Helm (helm)'],
    ]);

    it('carry all tied keys without type names', () => {
      const result = matchRunewords([htmRw('Rain', 1, recipe, { allowedItems: ['Wand', 'Knife'] })], txt);
      expect(result.byHtm.get('Rain::1')?.keys).toEqual(['Runeword1', 'Runeword2', 'Runeword3', 'Runeword4']);
      expect(result.byHtm.get('Rain::1')?.rows).toHaveLength(4);
    });

    it('are narrowed by allowed/excluded items (incl. the "Body Armor" label and "(code)" suffixes)', () => {
      const htm = [
        htmRw('Rain', 1, recipe, { allowedItems: ['Knife', 'Wand'], excludedItems: [] }),
        htmRw('Rain', 2, recipe, { allowedItems: ['Body Armor'], excludedItems: [] }),
        htmRw('Rain', 3, recipe, { allowedItems: ['Staff'], excludedItems: ['Orb'] }),
        htmRw('Rain', 4, recipe, { allowedItems: ['Helm'], excludedItems: [] }),
      ];
      const result = matchRunewords(htm, txt, { typeNames });
      expect(htm.map((rw) => result.byHtm.get(htmRunewordId(rw))?.keys)).toEqual([
        ['Runeword1'],
        ['Runeword2'],
        ['Runeword3'],
        ['Runeword4'],
      ]);
      expect(result.unmatchedTxt).toEqual([]);
    });

    it('keep all tied keys when no allowed items fit', () => {
      const result = matchRunewords([htmRw('Rain', 1, recipe, { allowedItems: ['Belt'] })], txt, { typeNames });
      expect(result.byHtm.get('Rain::1')?.keys).toHaveLength(4);
    });
  });
});
