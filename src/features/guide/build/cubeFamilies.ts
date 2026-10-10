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
  visibleOutputs,
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
];

export function findCubeFamily(id: string): CubeFamily | undefined {
  return CUBE_FAMILIES.find((family) => family.id === id);
}

export function familyRows(family: CubeFamily, esr: Pick<EsrGuideTables, 'cube'>): CubeRow[] {
  return esr.cube.filter((row) => family.match.test(row.description));
}

/** Output text; an item handed back unchanged (an output equal to an input) is left out, repeats are counted. */
function rowOutput(row: CubeRow, esr: Pick<EsrGuideTables, 'nameOf'>): string {
  const outputs = visibleOutputs(row.outputs);
  const kept = outputs.filter((output) => !row.inputs.includes(output.spec));
  const texts = (kept.length > 0 ? kept : outputs).map((output) => formatOutput(output, esr));
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
