/**
 * Curated groups of beginner-relevant cube recipes for `::recipes[family-id]`, matched against the `description`
 * column of cubemain.txt (enabled rows only). Families that collapse merge the mechanical variants of a recipe (one
 * row per base type, quality, class or socket count) into one row; the others list each distinct recipe once.
 *
 * Every family must match at least one row: `::recipes` fails the build otherwise, and a test checks the table
 * against the ESR clone, so a renamed recipe shows up instead of silently emptying a block.
 */
import type { RecipeRow, RecipesBlock } from '../engine/schema.ts';
import {
  capGroup,
  clusterVariants,
  countValues,
  formatInput,
  formatOutput,
  joinOptions,
  parseCubeCell,
  type RecipeVariant,
} from './cubeText.ts';
import type { CubeRow, EsrGuideTables } from './esrGuideSources.ts';

/** What families read: the cube rows, display names and the item list (internal names, e.g. a coupon's tier) */
export type FamilyTables = Pick<EsrGuideTables, 'cube' | 'nameOf' | 'items'>;

export interface CubeFamily {
  id: string;
  /** Block caption */
  label: string;
  /** Tested against the cubemain `description` */
  match: RegExp;
  /** Further narrows the matched rows, for descriptions other recipes share (e.g. the Crystal Can's "Moon Rune") */
  filter?: (row: CubeRow) => boolean;
  /** Rewrites a recipe's formatted text before merging, e.g. to make the per-item rows of one recipe generic */
  rewrite?: (recipe: RecipeVariant, row: CubeRow, esr: FamilyTables) => RecipeVariant;
  /**
   * Rows with the same key (`true`: the description; a function computes it) and number of inputs are merged by
   * clusterVariants and shown as at most MAX_GROUP_ROWS rows. Omitted: the whole family is one group, uncapped.
   */
  collapse?: true | ((row: CubeRow, esr: FamilyTables) => string);
  /** Formats the outputs of a random pool (same inputs, several outputs), most frequent first */
  pool?: (ranked: string[]) => string;
}

/** A family block shows at most this many rows; the caption counts the rest. */
export const MAX_FAMILY_ROWS = 12;

const internalNames = new WeakMap<FamilyTables, Map<string, string>>();

/** misc/armor/weapons `name` column of an item code */
function internalName(esr: FamilyTables, code: string): string | undefined {
  let names = internalNames.get(esr);
  if (names === undefined) {
    names = new Map();
    for (const item of esr.items) if (!names.has(item.code)) names.set(item.code, item.internalName);
    internalNames.set(esr, names);
  }
  return names.get(code);
}

function plural(count: number, word: string): string {
  return `${String(count)} ${word}${count === 1 ? '' : 's'}`;
}

// --- coupons -----------------------------------------------------------------------------------------------------

const COUPON_TIERS: Readonly<Partial<Record<string, string>>> = {
  nor: 'normal',
  exc: 'exceptional',
  eli: 'elite',
  amu: 'amulet or ring',
  rin: 'amulet or ring',
};

/**
 * Tier of a coupon code from its internal name ("Coupon exc Armor 12", "Coupon Ring 3") or of a coupon item type
 * ("Coupon norm"); null for anything else (the Wild Card is "Coupon Wild Card").
 */
function couponTier(token: string, esr: FamilyTables): string | null {
  const name = internalName(esr, token) ?? esr.nameOf(token);
  const match = /^Coupon (nor|exc|eli|amu|rin)/i.exec(name);
  return match === null ? null : (COUPON_TIERS[match[1].toLowerCase()] ?? null);
}

function isWildCard(token: string, esr: FamilyTables): boolean {
  return /^Coupon Wild Card$/.test(internalName(esr, token) ?? '');
}

/** A coupon item (names one unique), as opposed to a coupon item type (any coupon of a tier) */
function isNamedCoupon(token: string, esr: FamilyTables): boolean {
  return internalName(esr, token) !== undefined && couponTier(token, esr) !== null;
}

/** One generic row per coupon recipe shape instead of one per unique (~380 each). */
function genericCoupons(recipe: RecipeVariant, row: CubeRow, esr: FamilyTables): RecipeVariant {
  const cells = row.inputs.map(parseCubeCell);
  const withWildCard = cells.some((cell) => isWildCard(cell.token, esr));
  const redeems = cells.some((cell) => isNamedCoupon(cell.token, esr));
  const inputs = cells.map((cell, i) => {
    const tier = couponTier(cell.token, esr);
    if (isWildCard(cell.token, esr)) return plural(cell.qty, 'Wild Card');
    if (tier === null) return recipe.inputs[i] ?? '';
    if (isNamedCoupon(cell.token, esr)) {
      return withWildCard ? `${String(cell.qty)}× matching ${tier} coupons` : `${String(cell.qty)}× matching coupons (any tier)`;
    }
    return cell.qty === 1 ? `1 ${tier} coupon (any)` : `${String(cell.qty)}× ${tier} coupons (any)`;
  });
  const out = row.outputs
    .map((output) => parseCubeCell(output.spec).token)
    .find((token) => !row.inputs.some((spec) => parseCubeCell(spec).token === token));
  const outTier = out === undefined || !isNamedCoupon(out, esr) ? null : couponTier(out, esr);
  const output = outTier !== null ? `A random ${outTier} coupon` : redeems ? 'The LoD unique named on the coupons' : recipe.output;
  return { inputs, output };
}

function couponKey(row: CubeRow, esr: FamilyTables): string {
  const cells = row.inputs.map(parseCubeCell);
  // Redeeming with Wild Cards: one row per tier (the Wild Card count depends on it)
  const tier = cells.some((cell) => isWildCard(cell.token, esr))
    ? cells.map((cell) => (isNamedCoupon(cell.token, esr) ? couponTier(cell.token, esr) : null)).find((found) => found !== null)
    : undefined;
  const toWildCard = row.outputs.some((output) => isWildCard(parseCubeCell(output.spec).token, esr));
  return `${row.description}|${tier ?? ''}|${toWildCard ? 'wild card' : ''}`;
}

/** "A random exceptional coupon (sometimes elite / amulet or ring)" */
function couponPool(ranked: string[]): string {
  const tiers = ranked.map((output) => /^A random (.+) coupon$/.exec(output)?.[1]);
  if (tiers.some((tier) => tier === undefined)) return joinOptions(ranked);
  const [first, ...rest] = tiers;
  return `A random ${first ?? ''} coupon${rest.length > 0 ? ` (sometimes ${rest.join(' / ')})` : ''}`;
}

// --- sockets -----------------------------------------------------------------------------------------------------

const SOCKET_QUALITY: Readonly<Partial<Record<string, string>>> = {
  nor: 'Normal or Superior',
  hiq: 'Normal or Superior',
  mag: 'Magic',
  rar: 'Rare or Crafted',
  crf: 'Rare or Crafted',
  set: 'Set',
  uni: 'Unique',
};
const BASE_TIER: Readonly<Partial<Record<string, string>>> = { bas: 'normal', exc: 'exceptional', eli: 'elite' };
const SMALL_PARTS = new Set(['belt', 'boot', 'glov']);

/** "Rare or Crafted belt, boots or gloves", "Magic item", "Normal quiver"; null for other rows (charms, donuts) */
function socketBase(row: CubeRow): { label: string; tier: string | null } | null {
  const first = row.inputs.at(0);
  if (first === undefined || !/Socket Donut/.test(row.description) || /^Socket Donut:|Odd Charm/.test(row.description)) return null;
  const { token, qualifiers } = parseCubeCell(first);
  const quality = qualifiers.map((part) => SOCKET_QUALITY[part]).find((found) => found !== undefined);
  const tier = qualifiers.map((part) => BASE_TIER[part]).find((found) => found !== undefined) ?? null;
  if (quality === undefined) return null;
  if (/Quiver/.test(row.description)) return { label: `${qualifiers.includes('mag') ? 'Magic' : 'Normal'} quiver`, tier: null };
  return { label: `${quality} ${SMALL_PARTS.has(token) ? 'belt, boots or gloves' : 'item'}`, tier };
}

function socketCount(text: string): number | null {
  const match = /(\d+) sockets?\)/.exec(text);
  return match === null ? null : Number(match[1]);
}

/** Generic base and gem text; "N× gem → N sockets" when the gem count equals the socket count. */
function genericSockets(recipe: RecipeVariant, row: CubeRow, esr: FamilyTables): RecipeVariant {
  const base = socketBase(row);
  if (base === null) return recipe;
  const sockets = socketCount(recipe.output);
  const perGem = row.inputs.some((spec) => {
    const cell = parseCubeCell(spec);
    return /^gem\d$/.test(cell.token) && cell.qty === sockets && cell.qty > 1;
  });
  const inputs = row.inputs.map((spec, i) => {
    const text = recipe.inputs[i] ?? '';
    if (i === 0) return `${base.label} (no sockets)`;
    const cell = parseCubeCell(spec);
    if (!/^gem\d$/.test(cell.token)) return text;
    const name = esr.nameOf(cell.token);
    const where = base.tier === null ? '' : ` (${base.tier} base)`;
    return `${perGem || (sockets !== null && cell.qty === sockets && /^Normal or/.test(base.label)) ? 'N× ' : cell.qty > 1 ? `${String(cell.qty)}× ` : ''}${name}${where}`;
  });
  const generic = /^Normal or/.test(base.label) && sockets !== null;
  const output = generic
    ? recipe.output.replace(/\(\d+ sockets?\)/, '(N sockets, one per gem)')
    : /quiver/.test(base.label)
      ? `The same quiver (${plural(sockets ?? 1, 'socket')})`
      : recipe.output;
  return { inputs, output };
}

// --- maps --------------------------------------------------------------------------------------------------------

function mapTier(token: string, esr: FamilyTables): number | null {
  const match = /^Tier (\d+) Map/.exec(internalName(esr, token) ?? '');
  return match === null ? null : Number(match[1]);
}

/** "3× Tier N map → Tier N+1 map", "Randomizing Stone + 2× Tier N map → A random Tier N map" */
function genericMaps(recipe: RecipeVariant, row: CubeRow, esr: FamilyTables): RecipeVariant {
  const cells = row.inputs.map(parseCubeCell);
  const tiers = cells.map((cell) => mapTier(cell.token, esr));
  const tier = tiers.find((found): found is number => found !== null);
  const outTier = row.outputs
    .map((output) => mapTier(parseCubeCell(output.spec).token, esr))
    .find((found): found is number => found !== null);
  if (tier === undefined || outTier === undefined || tiers.some((t) => t !== null && t !== tier)) return recipe;
  const maps = cells.filter((_, i) => tiers[i] !== null);
  const inputs = cells.map((cell, i) => {
    if (tiers[i] === null) return recipe.inputs[i] ?? '';
    if (cell.qty > 1) return `${String(cell.qty)}× Tier N map (the same map)`;
    return maps.length > 1 && maps.indexOf(cell) > 0 ? 'Another Tier N map' : 'Tier N map';
  });
  if (outTier === tier + 1) return { inputs, output: 'Tier N+1 map (each map has a fixed upgrade)' };
  if (outTier === tier) return { inputs, output: 'A random Tier N map' };
  return recipe;
}

// --- gems, crystals, forging -------------------------------------------------------------------------------------

const GEM = /^(\d+× )?(?:(Chipped|Flawed|Flawless|Blemished|Perfect) )?(?:Amethyst|Topaz|Sapphire|Emerald|Ruby|Diamond|Skull|Obsidian)$/;

function genericGems({ inputs, output }: RecipeVariant): RecipeVariant {
  const generic = (text: string) =>
    text.replace(GEM, (_, qty: string | undefined, grade: string | undefined) => `${qty ?? ''}${grade ?? 'Standard'} gem`);
  return { inputs: inputs.map(generic), output: GEM.test(output) ? `${generic(output)} of the same colour` : output };
}

const CRYSTAL = /^(\d+× )?(Chipped|Flawed) .+$/;

function genericCrystals({ inputs, output }: RecipeVariant): RecipeVariant {
  const grade = /^(Chipped|Flawed) /.exec(output)?.[1] ?? 'Standard';
  return { inputs: inputs.map((input) => input.replace(CRYSTAL, '$1$2 crystal')), output: `${grade} crystal of the same kind` };
}

/** Removing a rune forging hands back the runes that were forged in, whichever they were. */
function genericRuneRemoval({ inputs, output }: RecipeVariant): RecipeVariant {
  return {
    inputs,
    output: output
      .split(' + ')
      .map((part) => (/ Rune$/.test(part) ? part.replace(/^(\d+× )?.*$/, '$1the forged rune') : part))
      .join(' + '),
  };
}

// --- runes -------------------------------------------------------------------------------------------------------

const RUNE_CODE = /^r(\d\d)$/;

function runeNumber(token: string): number | null {
  const match = RUNE_CODE.exec(token);
  return match === null ? null : Number(match[1]);
}

/** Item code of a rune number: 1 → `r01` */
function runeCode(n: number): string {
  return `r${String(n).padStart(2, '0')}`;
}

const runesByDescription = new WeakMap<FamilyTables, Map<string, number[]>>();

/**
 * The rune numbers of the rune input cells with this `qty`, over every row with this description (sorted, distinct);
 * the quantity keeps "2× I Rune → U Rune" apart from "Wo Rune + Full Rejuv Potion" under one description.
 */
function runesOf(esr: FamilyTables, description: string, qty: number): number[] {
  let cache = runesByDescription.get(esr);
  if (cache === undefined) {
    cache = new Map();
    runesByDescription.set(esr, cache);
  }
  const key = `${description}\u0000${String(qty)}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const numbers = new Set<number>();
  for (const row of esr.cube) {
    if (row.description !== description) continue;
    for (const cell of row.inputs.map(parseCubeCell)) {
      const rune = runeNumber(cell.token);
      if (rune !== null && cell.qty === qty) numbers.add(rune);
    }
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  cache.set(key, sorted);
  return sorted;
}

/** "I Rune to Wo Rune, Moon Rune to God Rune": runs of consecutive rune codes; "N kinds" past three runs */
function runeRuns(numbers: readonly number[], esr: FamilyTables): string {
  const runs: [number, number][] = [];
  for (const n of numbers) {
    const last = runs.at(-1);
    if (last !== undefined && last[1] === n - 1) last[1] = n;
    else runs.push([n, n]);
  }
  if (runs.length > 3) return `${String(numbers.length)} kinds`;
  const name = (n: number) => esr.nameOf(runeCode(n));
  return runs.map(([from, to]) => (from === to ? name(from) : `${name(from)} to ${name(to)}`)).join(', ');
}

/** Rune forging: one row per rune becomes "2× the same rune (I Rune to Wo Rune, …)" per slot. */
function genericRuneForging(recipe: RecipeVariant, row: CubeRow, esr: FamilyTables): RecipeVariant {
  const inputs = row.inputs.map((spec, i) => {
    const cell = parseCubeCell(spec);
    if (runeNumber(cell.token) === null) return recipe.inputs[i] ?? '';
    return `${String(cell.qty)}× the same rune (${runeRuns(runesOf(esr, row.description, cell.qty), esr)})`;
  });
  return { inputs, output: recipe.output };
}

/** "Ancient Decal (Ho -> Pul)" → ["Ho", "Pul"] */
function decalPair(name: string): [string, string] | null {
  const match = /\((\S+) -> (\S+)\)$/.exec(name);
  return match === null ? null : [match[1], match[2]];
}

function runeStem(name: string): string {
  return name.replace(/ Rune$/, '');
}

/**
 * Rune conversions, one generic row per recipe: "2× the same rune (…)" → "The next rune", and the Decal rows as
 * "Ancient Decal (X -> Y) + X Rune → Y Rune", but only after checking that each Decal names the runes of its row.
 */
function genericRuneConversion(recipe: RecipeVariant, row: CubeRow, esr: FamilyTables): RecipeVariant {
  const cells = row.inputs.map(parseCubeCell);
  const outputs = row.outputs.map((output) => parseCubeCell(output.spec).token);
  const only = cells.length === 1 ? cells[0] : undefined;
  const runes = () => runeRuns(runesOf(esr, row.description, only?.qty ?? 1), esr);
  if (row.description === 'rune upgrade' && only !== undefined && only.qty > 1 && runeNumber(only.token) !== null) {
    return { inputs: [`${String(only.qty)}× the same rune (${runes()})`], output: 'The next rune' };
  }
  if (row.description === 'rune downgrade' && only !== undefined && runeNumber(only.token) !== null) {
    return { inputs: [`A rune (${runes()})`], output: 'The rune one grade lower' };
  }
  if (row.description === 'decal upgrade' && only !== undefined && only.qty > 1) {
    return { inputs: [`${String(only.qty)}× the same Ancient Decal`], output: 'The next Ancient Decal' };
  }
  const [decal, rune, lod] = [cells.at(0), cells.at(1), outputs.at(0)];
  if (row.description === 'decal ON' && cells.length === 2 && decal !== undefined && rune !== undefined && lod !== undefined) {
    const pair = decalPair(esr.nameOf(decal.token));
    if (pair !== null && pair[0] === runeStem(esr.nameOf(rune.token)) && pair[1] === runeStem(esr.nameOf(lod))) {
      return { inputs: ['Ancient Decal (X -> Y)', 'X Rune (the ES rune named on the Decal)'], output: 'Y Rune (an LoD rune)' };
    }
  }
  const [es, decalOut] = [outputs.at(0), outputs.at(1)];
  if (row.description === 'decal OFF' && only !== undefined && es !== undefined && decalOut !== undefined) {
    const pair = decalPair(esr.nameOf(decalOut));
    if (pair !== null && pair[0] === runeStem(esr.nameOf(es)) && pair[1] === runeStem(esr.nameOf(only.token))) {
      return { inputs: [`An LoD rune (${runes()})`], output: 'The ES rune and the Ancient Decal named after it' };
    }
  }
  return recipe;
}

const KANJI_SOURCE = 'r50';

const CLASSES: Readonly<Partial<Record<string, string>>> = {
  Ama: 'Amazon',
  Ass: 'Assassin',
  Bar: 'Barbarian',
  Dru: 'Druid',
  Nec: 'Necromancer',
  Pal: 'Paladin',
  Sor: 'Sorceress',
  War: 'Warlock',
};

/**
 * The quality/slot variants of a forging (set, unique, magic, rare, crafted, white, socketed; weapon, armor, ring,
 * amulet) as one generic item; jewels stay as they are.
 */
function anyEquipment(recipe: RecipeVariant, row: CubeRow): RecipeVariant {
  const first = parseCubeCell(row.inputs[0] ?? '').token;
  if (first === 'jewl') return recipe;
  return { inputs: recipe.inputs.map((input, i) => (i === 0 ? 'Equipment of any quality (no runeword)' : input)), output: recipe.output };
}

/** The class a skill forging row is for, named in the output (the descriptions are not shown). */
function skillForgingClass(recipe: RecipeVariant, row: CubeRow): RecipeVariant {
  const tag = /Skill Forging (\w{3})$/.exec(row.description)?.[1];
  const name = tag === undefined ? undefined : CLASSES[tag];
  return name === undefined ? recipe : { ...recipe, output: `${recipe.output} (+${name} skills)` };
}

export const CUBE_FAMILIES: readonly CubeFamily[] = [
  { id: 'dstone-cycle', label: 'Dragon Stone cycle (one material into the next)', match: /^Dstone Transformation$/ },
  { id: 'anvil-stone', label: 'Making Anvil Stones', match: /^"?(?:Anvil Stone|Multi Stocker .*\+1 Anvil Stone)"?$/ },
  {
    id: 'remove-forging',
    label: 'Removing a forging (Thawing Potions)',
    match: /^Remove .*Forging/,
    rewrite: genericRuneRemoval,
    collapse: (row) => /(All Skill|Skill|Stat|Rune|Aura) Forging/.exec(row.description)?.[1] ?? row.description,
  },
  {
    id: 'skill-forging',
    label: 'Class skill forging',
    match: /^(?:(?:Weapon|Armor|Ring|Amulet|Unique Charm) Skill Forging \w+|Skill Forging Unique Jewel)$/,
    rewrite: skillForgingClass,
    // One row per class: the gem picks the class, the rows only differ in the item slot.
    collapse: (row) => /Skill Forging (\w+)$/.exec(row.description)?.[1] ?? row.description,
  },
  {
    id: 'all-skill-forging',
    label: 'All skills forging',
    match: /^All Skill Forging /,
    rewrite: anyEquipment,
    collapse: () => 'all',
  },
  { id: 'aura-forging', label: 'Aura forging (amulets)', match: /^Aura Forging$/ },
  {
    id: 'rune-forging',
    label: 'Rune forging',
    // The wand, staff, glove, torso, shield and belt rows only change the bonus of some runes on those items; the
    // weapon and armor rows already accept those items, so they are left out to keep the rune lists honest.
    match: /^Rune Forging (?:weap|armo|ring|amul|Jewel [WH])$/,
    rewrite: genericRuneForging,
  },
  {
    id: 'stat-forging',
    label: 'Stat forging',
    match: /^(?!Remove )(?:\w+ )*Stat Forging (?:\w{3}_\w+|Unique Jewel|Mag\/Rar Jewel)$/,
    rewrite: anyEquipment,
    // One row for equipment (the gem colours merged) and one per jewel recipe.
    collapse: (row) => (/Jewel$/.test(row.description) ? row.description : 'equipment'),
  },
  {
    id: 'socket',
    label: 'Adding sockets with a Socket Donut',
    match: /^(?:Adds Socket\(\d+\): .*Socket Donut|Socket Donut: )/,
    rewrite: genericSockets,
    // The odd charm rows (one more socket per use) differ only in a hidden socket-count condition: one pooled row.
    collapse: (row) => socketBase(row)?.label ?? (/Odd Charm/.test(row.description) ? 'odd charm' : row.description),
  },
  {
    id: 'coupon-tiers',
    label: 'Coupons and Wild Cards',
    match: /^(?:Coupon|Coupon Reroll|\d+ Decipherers: Wild Card \+ Key)$/,
    rewrite: genericCoupons,
    collapse: couponKey,
    pool: couponPool,
  },
  {
    id: 'gem-upgrade',
    label: 'Gem upgrades',
    match: /^[LNFBP]-(?:Ame|Top|Sap|Eme|Rub|Dia|Sku|Obs): \d+ [CLNFB]-\w+(?: \+ \d* ?Wildcards?)?$/,
    rewrite: genericGems,
    collapse: (row) => row.description.replace(/\b(?:Ame|Top|Sap|Eme|Rub|Dia|Sku|Obs)\b/g, '*'),
  },
  {
    id: 'crystal-upgrade',
    label: 'Crystal upgrades',
    match: /^Upgrade Crystal \d+$/,
    rewrite: genericCrystals,
    collapse: () => 'crystal',
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
    rewrite: genericMaps,
    collapse: (row) => (row.description.includes('->') ? 'upgrade' : 'reroll'),
  },
  {
    id: 'charm-reroll',
    label: 'Charm rerolls and upgrades',
    match: /^(?:(?:\[SECRET\d+\] )?(?:Magic|Rare) Charm(?: Reroll)?: |Reset Nor Odd Charm$)/,
    collapse: true,
  },
  {
    id: 'rune-conversion',
    label: 'Rune upgrades and conversions',
    match: /^(?:rune upgrade|rune downgrade|decal upgrade|decal ON|decal OFF|Nul -> Wo|Wo -> Nul|\w+ Rune)$/,
    // "Moon Rune" … "God Rune" also name the Crystal Can rows; the Kanji recipes start from a Null Rune.
    filter: (row) => !/^\w+ Rune$/.test(row.description) || parseCubeCell(row.inputs[0] ?? '').token === KANJI_SOURCE,
    rewrite: genericRuneConversion,
    // Wo ↔ Null (also listed as a rune upgrade) is one group; the Kanji runes are one capped group.
    collapse: (row) =>
      /^(?:Nul -> Wo|Wo -> Nul)$/.test(row.description) || row.inputs.includes('rvl')
        ? 'null'
        : /^\w+ Rune$/.test(row.description)
          ? 'kanji'
          : row.description,
  },
  // One row per organ, weapon and armor merged (the bonus is in the row's mods, not shown)
  {
    id: 'tinkering',
    label: 'Tinkering with organs',
    match: /^Tinkering Adds /,
    collapse: (row) => parseCubeCell(row.inputs[1] ?? '').token,
  },
  {
    id: 'uber-keys',
    label: 'Pandemonium keys and portals',
    match: /^(?:Key of \w+ \+ Blemished Gem \+ .+ Conversion|Pandemonium Key Set (?:Wrap|Unwrap)|1 Key of Terror \+ |1 Diablo's Horn \+ )/,
  },
];

export function findCubeFamily(id: string): CubeFamily | undefined {
  return CUBE_FAMILIES.find((family) => family.id === id);
}

export function familyRows(family: CubeFamily, esr: Pick<EsrGuideTables, 'cube'>): CubeRow[] {
  return esr.cube.filter((row) => family.match.test(row.description) && (family.filter?.(row) ?? true));
}

/** Output text; an item handed back unchanged (an output equal to an input) is left out, repeats are counted. */
function rowOutput(row: CubeRow, esr: Pick<EsrGuideTables, 'nameOf'>): string {
  const kept = row.outputs.filter((output) => !row.inputs.includes(output.spec));
  const texts = (kept.length > 0 ? kept : row.outputs).map((output) => formatOutput(output, esr));
  return [...countValues(texts)].map(([text, count]) => (count > 1 ? `${String(count)}× ${text}` : text)).join(' + ');
}

/**
 * The family's rows in file order (of each group's first row), merged as configured, before the row cap. Notes stay
 * empty (the txt descriptions are dev labels) except for "… and N more" on a capped group.
 */
export function collectFamily(family: CubeFamily, esr: FamilyTables): RecipeRow[] {
  const groups = new Map<string, RecipeVariant[]>();
  for (const row of familyRows(family, esr)) {
    const text = { inputs: row.inputs.map((input) => formatInput(input, esr)), output: rowOutput(row, esr) };
    const variant = family.rewrite === undefined ? text : family.rewrite(text, row, esr);
    const collapse = family.collapse;
    const key =
      collapse === undefined ? '' : `${String(variant.inputs.length)}\u0000${collapse === true ? row.description : collapse(row, esr)}`;
    const group = groups.get(key) ?? [];
    group.push(variant);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap((variants) => {
    const rows = clusterVariants(variants, family.pool);
    return family.collapse === undefined ? rows.map((row) => ({ ...row, note: null })) : capGroup(rows, () => null);
  });
}

/** The `recipes` block of a family: at most MAX_FAMILY_ROWS rows, the caption counting the rest. */
export function familyBlock(family: CubeFamily, esr: FamilyTables): RecipesBlock {
  const rows = collectFamily(family, esr);
  const more = rows.length - MAX_FAMILY_ROWS;
  return {
    kind: 'recipes',
    caption: more > 0 ? `${family.label} (… and ${String(more)} more)` : family.label,
    rows: rows.slice(0, MAX_FAMILY_ROWS),
  };
}
