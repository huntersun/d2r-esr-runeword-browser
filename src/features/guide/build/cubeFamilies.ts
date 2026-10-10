/**
 * Curated groups of beginner-relevant cube recipes for `::recipes[family-id]`, matched against the `description`
 * column of cubemain.txt (enabled rows only). Families that collapse merge the mechanical variants of a recipe (one
 * row per base type, quality, class or socket count) into one row; the others list each distinct recipe once.
 *
 * Every family must match at least one row: `::recipes` fails the build otherwise, and a test checks the table
 * against the ESR clone, so a renamed recipe shows up instead of silently emptying a block.
 */
import type { DataBlock } from '../engine/schema.ts';
import { formatInput, formatOutput, mergeInputs, options, unique, visibleOutputs } from './directives/cubeText.ts';
import type { CubeRow, EsrGuideTables } from './esrGuideSources.ts';

type RecipeRow = Extract<DataBlock, { kind: 'recipes' }>['rows'][number];

export interface RecipeText {
  inputs: string[];
  output: string;
}

export interface CubeFamily {
  id: string;
  /** Block caption */
  label: string;
  /** Tested against the cubemain `description` */
  match: RegExp;
  /** Rewrites a recipe's formatted text before collapsing, e.g. to make per-item rows generic */
  rewrite?: (recipe: RecipeText) => RecipeText;
  /**
   * Merge rows into one per key: `true` keys by the description, a function computes the key. Rows with a different
   * number of inputs never merge. Omitted: one row per distinct recipe (identical rows, e.g. per class, are dropped).
   */
  collapse?: true | ((row: CubeRow) => string);
}

/** A family block shows at most this many rows; the caption counts the rest. */
export const MAX_FAMILY_ROWS = 12;

/** A coupon naming its unique ("Ancient Coupon (Buckler, Pelta Lunata)", "Ancient Coupon Amulet I (Nokozan Relic)"), not the Wild Card */
const NAMED_COUPON = /^(\d+× )?Ancient Coupon(?! \(Wild Card\)) .*$/;

/** One generic row for the ~380 per-unique coupon recipes (and their rerolls). */
function genericCoupons({ inputs, output }: RecipeText): RecipeText {
  const named = inputs.some((input) => NAMED_COUPON.test(input));
  return {
    inputs: inputs.map((input) => input.replace(NAMED_COUPON, '$1Ancient Coupon (matching)')),
    output: NAMED_COUPON.test(output) ? 'A random Ancient Coupon of that tier' : named ? 'The LoD unique named on the coupons' : output,
  };
}

const GEM_COLORS = /\b(Ame|Top|Sap|Eme|Rub|Dia|Sku|Obs)\b/g;

/** "Adds Socket(2): Rar exc Helm + 1 F-Gems + Socket Donut" → "Rar item"; quivers and odd charms stay apart. */
function socketKey(row: CubeRow): string {
  const match = /^Adds Socket\(\d+\): (\w+) (.*?)\s*\+/.exec(row.description);
  if (match === null) return row.description;
  const what = /Quiver|Odd Charm/.exec(match[2])?.[0] ?? 'item';
  return `${match[1]} ${what}`;
}

export const CUBE_FAMILIES: readonly CubeFamily[] = [
  { id: 'dstone-cycle', label: 'Dragon Stone cycle (one material into the next)', match: /^Dstone Transformation$/ },
  { id: 'anvil-stone', label: 'Making Anvil Stones', match: /Anvil Stone/ },
  {
    id: 'remove-forging',
    label: 'Removing a forging (Thawing Potions)',
    match: /^Remove .*Forging/,
    collapse: (row) => /(All Skill|Skill|Stat|Rune|Aura) Forging/.exec(row.description)?.[1] ?? row.description,
  },
  {
    id: 'skill-forging',
    label: 'Class skill forging',
    match: /^(?:(?:Weapon|Armor|Ring|Amulet|Unique Charm) Skill Forging \w+|Skill Forging Unique Jewel)$/,
    // One row per class: the gem picks the class, the rows only differ in the item slot.
    collapse: (row) => /Skill Forging (\w+)$/.exec(row.description)?.[1] ?? row.description,
  },
  { id: 'all-skill-forging', label: 'All skills forging', match: /^All Skill Forging /, collapse: true },
  { id: 'aura-forging', label: 'Aura forging (amulets)', match: /^Aura Forging$/ },
  {
    id: 'stat-forging',
    label: 'Stat forging',
    match: /^(?!Remove )(?:\w+ )*Stat Forging (?:\w{3}_\w+|Unique Jewel|Mag\/Rar Jewel)$/,
    // One row per stat (the class tag / gem colour), merging item qualities and slots.
    collapse: (row) => /Stat Forging (\w{3})_/.exec(row.description)?.[1] ?? row.description,
  },
  {
    id: 'socket',
    label: 'Adding sockets with a Socket Donut',
    match: /^(?:Adds Socket\(\d+\): .*Socket Donut|Socket Donut: )/,
    collapse: socketKey,
  },
  {
    id: 'coupon-tiers',
    label: 'Coupons and Wild Cards',
    match: /^(?:Coupon|Coupon Reroll|\d+ Decipherers: Wild Card \+ Key)$/,
    rewrite: genericCoupons,
    // "Coupon" rows either redeem coupons for the unique or trade tier coupons for a Wild Card (output 99j).
    collapse: (row) => `${row.description}${row.outputs.some((output) => output.spec === '99j') ? ' → Wild Card' : ''}`,
  },
  {
    id: 'gem-upgrade',
    label: 'Gem upgrades',
    match: /^[LNFBP]-(?:Ame|Top|Sap|Eme|Rub|Dia|Sku|Obs): \d+ [CLNFB]-\w+(?: \+ \d* ?Wildcards?)?$/,
    collapse: (row) => row.description.replace(GEM_COLORS, '*'),
  },
  {
    id: 'crystal-upgrade',
    label: 'Crystal upgrades',
    match: /^Upgrade Crystal \d+$/,
    // Chipped → Flawed and Flawed → normal: keyed by the input's code prefix (xr…, xl…).
    collapse: (row) => (row.inputs[0] ?? '').slice(0, 2),
  },
  {
    id: 'legendary-consumables',
    label: 'Legendary consumables',
    match:
      /^(?:Inarius' Everburning Halo|Astrogha's Petrified Heart|Lilith's Crystallized Tear|Tyrael's Eternal Feather|Add Sanctification Dummy Stat)/,
    collapse: (row) => row.description.replace(/\s*(?:-\s*)?(?:Weapon|Armor|Ring|Amulet|Arrow Quiver|Bolt Quiver|Melee|Throw|Jewel)$/, ''),
  },
  { id: 'respec-token', label: 'Token of Absolution', match: /^Token of Absolution$/ },
  { id: 'starter-pack', label: "Adventurer's Pack", match: /^(?:Another )?Adventurer's Pack$/ },
  {
    id: 'map-upgrade',
    label: 'Map upgrades and rerolls',
    match: /^Tier \d+ (?:-> \d+ |Map Randomization$)/,
    collapse: (row) => /^Tier \d+ -> \d+/.exec(row.description)?.[0] ?? row.description.replace(/\d+/g, 'N'),
  },
  {
    id: 'charm-reroll',
    label: 'Charm rerolls and upgrades',
    match: /^(?:(?:\[SECRET\d+\] )?(?:Magic|Rare) Charm(?: Reroll)?: |Reset Nor Odd Charm$)/,
    collapse: true,
  },
];

export function findCubeFamily(id: string): CubeFamily | undefined {
  return CUBE_FAMILIES.find((family) => family.id === id);
}

export function familyRows(family: CubeFamily, esr: Pick<EsrGuideTables, 'cube'>): CubeRow[] {
  return esr.cube.filter((row) => family.match.test(row.description));
}

/** The description as a note (some cells keep the quotes Excel added around text with commas) */
function description(row: CubeRow): string {
  return row.description.replace(/^"|"$/g, '').trim();
}

/** Output text; an item handed back unchanged (an output equal to an input) is left out, repeats are counted. */
function rowOutput(row: CubeRow, esr: Pick<EsrGuideTables, 'nameOf'>): string {
  const outputs = visibleOutputs(row.outputs);
  const kept = outputs.filter((output) => !row.inputs.includes(output.spec));
  const texts = (kept.length > 0 ? kept : outputs).map((output) => formatOutput(output, esr));
  const counts = new Map<string, number>();
  for (const text of texts) counts.set(text, (counts.get(text) ?? 0) + 1);
  return [...counts].map(([text, count]) => (count > 1 ? `${String(count)}× ${text}` : text)).join(' + ');
}

/** The family's rows in file order (of each group's first row), collapsed as configured, before the row cap. */
export function collectFamily(family: CubeFamily, esr: Pick<EsrGuideTables, 'cube' | 'nameOf'>): RecipeRow[] {
  const rows = familyRows(family, esr);
  const groups = new Map<string, { inputs: string[][]; outputs: string[]; descriptions: string[] }>();
  for (const row of rows) {
    const text = { inputs: row.inputs.map((input) => formatInput(input, esr)), output: rowOutput(row, esr) };
    const { inputs, output } = family.rewrite === undefined ? text : family.rewrite(text);
    const collapse = family.collapse;
    const key =
      collapse === undefined
        ? JSON.stringify([inputs, output])
        : `${String(inputs.length)}\u0000${collapse === true ? row.description : collapse(row)}`;
    let group = groups.get(key);
    if (group === undefined) {
      group = { inputs: [], outputs: [], descriptions: [] };
      groups.set(key, group);
    }
    group.inputs.push(inputs);
    group.outputs.push(output);
    group.descriptions.push(description(row));
  }

  const distinctDescriptions = unique(rows.map(description)).length;
  return [...groups.values()].map((group) => {
    const inputs = unique(group.inputs.map((list) => JSON.stringify(list))).map((json) => JSON.parse(json) as string[]);
    const descriptions = unique(group.descriptions);
    const more = descriptions.length - 1;
    const note =
      family.collapse === undefined && distinctDescriptions === 1
        ? null
        : `${descriptions[0] ?? ''}${more > 0 ? ` (+${String(more)} variant${more > 1 ? 's' : ''})` : ''}`;
    return { inputs: mergeInputs(inputs), output: options(group.outputs), note };
  });
}

/** The `recipes` block of a family: at most MAX_FAMILY_ROWS rows, the caption counting the rest. */
export function familyBlock(family: CubeFamily, esr: Pick<EsrGuideTables, 'cube' | 'nameOf'>): Extract<DataBlock, { kind: 'recipes' }> {
  const rows = collectFamily(family, esr);
  const more = rows.length - MAX_FAMILY_ROWS;
  return {
    kind: 'recipes',
    caption: more > 0 ? `${family.label} (… and ${String(more)} more)` : family.label,
    rows: rows.slice(0, MAX_FAMILY_ROWS),
  };
}
