import { describe, expect, it } from 'vitest';
import type { BaseTier } from '../constants/bases';
import type { SetInfo, SetItemInfo } from '../engine/schema';
import {
  ANY_CLASS,
  classOptions,
  EMPTY_SETS_STATE,
  encodeSetsState,
  filterSets,
  pieceOptions,
  readSetsState,
  reqLevelText,
  setDifficulty,
  setDocsUrl,
  setTierRange,
  sortSets,
  type SetsState,
} from './sets';

function item(name: string, reqLevel: number, lines: string[] = [], extra: Partial<SetItemInfo> = {}): SetItemInfo {
  return { name, code: 'amu', baseName: 'Amulet', category: 'Amulet', level: reqLevel, reqLevel, lines, partial: [], ...extra };
}

function set(id: string, items: SetItemInfo[], extra: Partial<SetInfo> = {}): SetInfo {
  const levels = items.map((entry) => entry.reqLevel);
  return {
    id,
    name: id,
    classCode: null,
    className: null,
    reqLevel: { min: Math.min(...levels), max: Math.max(...levels) },
    items,
    partial: [],
    full: [],
    ...extra,
  };
}

const ARCANNA = set(
  "Arcanna's Tricks",
  [
    item("Arcanna's Sign", 1, ['+15 to Mana'], { partial: [{ pieces: 2, lines: ['+1 to All Skills'] }] }),
    item("Arcanna's Deathwand", 1, ['+(1 to 3) to Fire Bolt'], { baseName: 'Short Staff', category: 'Staff' }),
    item("Arcanna's Flesh", 1, ['+30 Defense']),
  ],
  { classCode: 'sor', className: 'Sorceress', full: ['+2 to Sorceress Skill Levels'] }
);
const TARA = set(
  "Tara's Calling",
  [item("Tara's Vision", 16), item("Tara's Eye", 16, ['+20% Faster Cast Rate']), item("Tara's Gown", 16), item("Tara's Shell", 20)],
  { classCode: 'sor', className: 'Sorceress' }
);
const KIT_N = set("Kashya's Survival Kit", [item('Bow-N', 10), item('Suit-N', 10), item('Cap-N', 10)], { id: 'Kit-N' });
const KIT_H = set("Kashya's Survival Kit", [item('Bow-H', 50), item('Suit-H', 50), item('Cap-H', 50)], { id: 'Kit-H' });
const HARBINGER = set('Harbinger of Ruin', [item('Rule', 60), item('Gemstone', 70), item('Wrap', 70), item('Compendium', 70)], {
  classCode: 'war',
  className: 'Warlock',
  partial: [{ pieces: 2, lines: ['+100 to Life'] }],
  full: ['Flame Wave deals 100% more total damage'],
});
const SETS = [ARCANNA, TARA, KIT_N, KIT_H, HARBINGER];

const state = (patch: Partial<SetsState>): SetsState => ({ ...EMPTY_SETS_STATE, ...patch });
const shown = (patch: Partial<SetsState>) => filterSets(SETS, state(patch)).map((view) => view.set.id);
const highlighted = (patch: Partial<SetsState>) =>
  filterSets(SETS, state(patch)).map((view) => [view.set.id, [...view.highlighted].map((i) => view.set.items[i]?.name)]);

describe('sets URL state', () => {
  it('reads every param; unknown piece counts and classes show every set', () => {
    expect(readSetsState(new URLSearchParams('search=mana&maxlvl=30&pieces=4&cls=sor&name=Tara%27s%20Eye'), { sets: SETS })).toEqual({
      search: 'mana',
      maxLevel: 30,
      pieces: 4,
      cls: 'sor',
      name: "Tara's Eye",
    });
    expect(readSetsState(new URLSearchParams('pieces=7&cls=ama&maxlvl=0&name=%20'), { sets: SETS })).toEqual(EMPTY_SETS_STATE);
    expect(readSetsState(new URLSearchParams(`cls=${ANY_CLASS}`), { sets: SETS }).cls).toBe(ANY_CLASS);
  });

  it('encodes only the set filters and round-trips', () => {
    expect(encodeSetsState(EMPTY_SETS_STATE).toString()).toBe('');
    const full = state({ search: ' fire bolt ', maxLevel: 30, pieces: 3, cls: 'sor', name: 'X' });
    expect(encodeSetsState(full).toString()).toBe('name=X&cls=sor&pieces=3&maxlvl=30&search=fire+bolt');
    expect(readSetsState(encodeSetsState(full), { sets: SETS })).toEqual({ ...full, search: 'fire bolt' });
  });
});

describe('set options and order', () => {
  it('lists the piece counts and the classes by name', () => {
    expect(pieceOptions(SETS)).toEqual([3, 4]);
    expect(classOptions(SETS)).toEqual([
      { code: 'sor', name: 'Sorceress' },
      { code: 'war', name: 'Warlock' },
    ]);
  });

  it('sorts by the highest required level, then name', () => {
    expect(sortSets(SETS).map((entry) => entry.id)).toEqual(["Arcanna's Tricks", 'Kit-N', "Tara's Calling", 'Kit-H', 'Harbinger of Ruin']);
  });
});

describe('filterSets', () => {
  it('keeps a set only when the whole set is wearable at the max level', () => {
    expect(shown({ maxLevel: 60 })).toEqual(["Arcanna's Tricks", "Tara's Calling", 'Kit-N', 'Kit-H']);
    expect(shown({ maxLevel: 70 })).toContain('Harbinger of Ruin');
  });

  it('filters by piece count and class; "any" keeps the sets without a class', () => {
    expect(shown({ pieces: 4 })).toEqual(["Tara's Calling", 'Harbinger of Ruin']);
    expect(shown({ cls: 'sor' })).toEqual(["Arcanna's Tricks", "Tara's Calling"]);
    expect(shown({ cls: ANY_CLASS })).toEqual(['Kit-N', 'Kit-H']);
    expect(shown({ cls: 'war', pieces: 3 })).toEqual([]);
  });

  it('keeps whole sets matching every term anywhere and highlights the items that match on their own', () => {
    expect(highlighted({ search: 'fire bolt' })).toEqual([["Arcanna's Tricks", ["Arcanna's Deathwand"]]]);
    // Terms spread over two items keep the set without highlighting either
    expect(highlighted({ search: 'mana defense' })).toEqual([["Arcanna's Tricks", []]]);
    // Set-wide and per-item partial lines, base names and the class are searched too
    expect(shown({ search: '"flame wave"' })).toEqual(['Harbinger of Ruin']);
    expect(highlighted({ search: 'all skills' })).toEqual([["Arcanna's Tricks", ["Arcanna's Sign"]]]);
    expect(highlighted({ search: 'staff' })).toEqual([["Arcanna's Tricks", ["Arcanna's Deathwand"]]]);
    expect(shown({ search: 'warlock' })).toEqual(['Harbinger of Ruin']);
  });

  it('focuses a set name or an item name and ignores the other filters', () => {
    expect(highlighted({ name: "arcanna's tricks", cls: 'war' })).toEqual([["Arcanna's Tricks", []]]);
    expect(highlighted({ name: 'Tara’s Eye', maxLevel: 1 })).toEqual([["Tara's Calling", ["Tara's Eye"]]]);
    // Hireling sets share their name across difficulties
    expect(shown({ name: "Kashya's Survival Kit" })).toEqual(['Kit-N', 'Kit-H']);
    expect(shown({ name: 'Nothing' })).toEqual([]);
  });
});

describe('setDifficulty', () => {
  it('reads the hireling difficulty from the id suffix', () => {
    expect(setDifficulty({ id: "Kashya's Survival Kit-N" })).toBe('Normal');
    expect(setDifficulty({ id: "Greiz's Desert Pride-NM" })).toBe('Nightmare');
    expect(setDifficulty({ id: "Qual-Kehk's Barbaric Gear-H" })).toBe('Hell');
    // Class suffixes and inner dashes are not difficulties
    expect(setDifficulty({ id: "Arcanna's Tricks-Sor" })).toBeNull();
    expect(setDifficulty({ id: 'Qual-Kehk' })).toBeNull();
    expect(setDifficulty({ id: 'Harbinger of Ruin' })).toBeNull();
  });

  it('makes the difficulty searchable', () => {
    expect(shown({ search: 'nightmare' })).toEqual([]);
    expect(shown({ search: 'hell kashya' })).toEqual(['Kit-H']);
    expect(shown({ search: 'normal survival' })).toEqual(['Kit-N']);
  });
});

describe('set links and labels', () => {
  it('links the official page at the class section', () => {
    expect(setDocsUrl(ARCANNA)).toBe('https://easternsunresurrected.com/sets.htm#Sorceress');
    expect(setDocsUrl(KIT_N)).toBe('https://easternsunresurrected.com/sets.htm');
  });

  it('shows one level or a range', () => {
    expect(reqLevelText(ARCANNA.reqLevel)).toBe('Req Lvl 1');
    expect(reqLevelText(HARBINGER.reqLevel)).toBe('Req Lvl 60–70');
  });
});

describe('setTierRange', () => {
  const tierOf = new Map<string, BaseTier>([
    ['cap', 'normal'],
    ['xap', 'exceptional'],
    ['uap', 'elite'],
    ['m01', 'mythical'],
  ]);
  const codes = (...list: string[]) => list.map((code) => ({ code }));

  it('gives one tier when every tiered item shares it, skipping items without a tier', () => {
    expect(setTierRange(codes('xap', 'rin', 'xap', 'amu'), tierOf)).toEqual({ from: 'exceptional', to: 'exceptional' });
  });

  it('spans the lowest to the highest tier in tier order, not item order', () => {
    expect(setTierRange(codes('uap', 'cap', 'xap'), tierOf)).toEqual({ from: 'normal', to: 'elite' });
    expect(setTierRange(codes('m01', 'xap'), tierOf)).toEqual({ from: 'exceptional', to: 'mythical' });
  });

  it('is null when no item has a tier', () => {
    expect(setTierRange(codes('rin', 'amu', 'zzz'), tierOf)).toBeNull();
    expect(setTierRange([], tierOf)).toBeNull();
  });
});
