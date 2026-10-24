import { describe, expect, it } from 'vitest';
import { homeResultHref, rankNames, runewordsSearchHref, searchHome } from './homeSearch';

describe('rankNames', () => {
  const names = ['Black Enigma', 'Enigma', 'Enigmatic Ring', 'Stenigma', 'Oath', 'Mosaic'];

  it('matches case-insensitive substrings, exact then prefix then word prefix then substring', () => {
    expect(rankNames(names, 'enigma')).toEqual(['Enigma', 'Enigmatic Ring', 'Black Enigma', 'Stenigma']);
  });

  it('orders ties alphabetically and caps the list', () => {
    const many = ['Shadow D', 'Shadow B', 'Shadow A', 'Shadow C'];
    expect(rankNames(many, 'shadow', 3)).toEqual(['Shadow A', 'Shadow B', 'Shadow C']);
  });

  it('collapses duplicates (runeword variants) and ignores an empty query', () => {
    expect(rankNames(['Insight', 'Insight', 'insight'], 'ins')).toEqual(['Insight']);
    expect(rankNames(names, '   ')).toEqual([]);
  });

  it('unifies apostrophes and whitespace like the exact-name focus', () => {
    expect(rankNames(["Artemis' Wrath"], 'artemis’ w')).toEqual(["Artemis' Wrath"]);
    expect(rankNames(['Call to Arms'], '  call   to ')).toEqual(['Call to Arms']);
  });

  it('treats regex characters in the query literally', () => {
    expect(rankNames(['A (b)', 'Ab'], '(b')).toEqual(['A (b)']);
  });
});

describe('searchHome', () => {
  it('returns non-empty groups in category order and skips missing sources', () => {
    const groups = searchHome('ring', { bases: ['Ring', 'Ring Mail'], runewords: ['Ring of Fire'], uniques: ['Sword'] });
    expect(groups.map((g) => g.category)).toEqual(['runewords', 'bases']);
    expect(groups[1]?.names).toEqual(['Ring', 'Ring Mail']);
  });

  it('caps every group at six by default', () => {
    const names = Array.from({ length: 10 }, (_, i) => `Rune ${String(i)}`);
    expect(searchHome('rune', { runewords: names })[0]?.names).toHaveLength(6);
  });
});

describe('result links', () => {
  it('focuses the exact name on the list pages and phrase-searches bases', () => {
    expect(homeResultHref('runewords', 'Call to Arms')).toBe('/runewords?name=Call%20to%20Arms');
    expect(homeResultHref('gemwords', 'America')).toBe('/gemwords?name=America');
    expect(homeResultHref('uniques', "Artemis' Wrath")).toBe("/uniques?name=Artemis'%20Wrath");
    expect(homeResultHref('mythicals', 'X')).toBe('/mythicals?name=X');
    expect(homeResultHref('bases', 'Ring Mail')).toBe('/game-data/bases?search=%22Ring%20Mail%22');
  });

  it('sends a free-text Enter to the runewords search', () => {
    expect(runewordsSearchHref(' life leech ')).toBe('/runewords?search=life%20leech');
  });
});
