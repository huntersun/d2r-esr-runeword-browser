/**
 * What the cube reference (cube.json) shows: the rows it hides, the families after the guide's CUBE_FAMILIES, the
 * fallback grouping and the sections of the official Cube Recipes page each family belongs to.
 */
import { CUBE_FAMILIES, genericRuneForging, type CubeFamily } from './cubeFamilies.ts';
import type { CubeRow } from './cubeRows.ts';
import { parseCubeCell, type RecipeVariant } from './cubeText.ts';

// --- hidden rows --------------------------------------------------------------------------------------------------

/**
 * Why a row is not listed: `enhance` = corruption, anointment and Vessel of Souls tier rows (with their roll rows and
 * blockers), shown on the Enhance page from enhance.json; `traps` = `void` outputs and "Trap" rows (blockers);
 * `old` = "OLD (Delete later)" rows; `stockers` = stocker and can bookkeeping (storing and taking out materials);
 * `dummy` = the remaining "Add … Dummy Stat" roll rows.
 */
export type HiddenReason = 'enhance' | 'traps' | 'old' | 'stockers' | 'dummy';
export const HIDDEN_REASONS: readonly HiddenReason[] = ['enhance', 'traps', 'old', 'stockers', 'dummy'];

/** The rows enhance.json covers (matched by description; bundleEnhance classifies the same rows by their data) */
export const ENHANCE_ROW =
  /Corruption(?: Brick)? - |^Add (?:Corruption|Anointment) Dummy Stat|^Anointment - |^Vessel of Souls Tier \d+ - |^Check if already (?:Corrupted|Anointed)|^Prevent Vessel of Souls Corrupt/i;
const TRAP_ROW = /\bTrap\b/i;
const OLD_ROW = /OLD \(Delete later\)/;
const STOCKER_ROW = /Stocker|Gem Can|Xtal Can|Rerolling Orb/;
/**
 * Display or internal names of the stocker and can items (a row with one as input is bookkeeping). Not the Rerolling
 * Orb: it is an input of the custom ring and amulet rerolls.
 */
export const STOCKER_ITEM = /Stocker|Gem Can|Crystal Can|Xtal Can/;
const DUMMY_ROW = /^Add .*Dummy Stat/;

/** A guide family claims the row (first match): its rows are never "stocker" or "dummy" bookkeeping */
export function guideFamilyOf(row: CubeRow): CubeFamily | undefined {
  return CUBE_FAMILIES.find((family) => family.match.test(row.description) && (family.filter?.(row) ?? true));
}

/**
 * Why the row is hidden, null when it is listed. `claimed`: a guide family matches it (the Anvil Stone's Multi Stocker
 * row); `stockerInput`: an input is a stocker or can item (the Crystal Can rows are labelled "Moon Rune" …).
 */
export function hiddenReason(row: CubeRow, claimed: boolean, stockerInput = false): HiddenReason | null {
  if (ENHANCE_ROW.test(row.description)) return 'enhance';
  if (row.outputs.some((output) => output.spec === 'void') || TRAP_ROW.test(row.description)) return 'traps';
  if (OLD_ROW.test(row.description)) return 'old';
  if (claimed) return null;
  if (STOCKER_ROW.test(row.description) || stockerInput) return 'stockers';
  if (DUMMY_ROW.test(row.description)) return 'dummy';
  return null;
}

// --- sections -----------------------------------------------------------------------------------------------------

export const CUBE_DOCS_PAGE = 'Eastern Sun Resurrected Cube Recipes.html';

export interface SectionDef {
  id: string;
  label: string;
  /** Official docs page (file name), null when no page covers it */
  doc: string | null;
  /** Anchor on that page */
  anchor: string | null;
}

const cubePage = (id: string, label: string): SectionDef => ({ id, label, doc: CUBE_DOCS_PAGE, anchor: id });

/** In display order: the official Cube Recipes page's sections, then the pages for the endgame systems, then the rest */
export const CUBE_SECTIONS: readonly SectionDef[] = [
  cubePage('uber', 'Uber / Endgame Maps'),
  cubePage('legendary', 'Legendary Consumables'),
  cubePage('mis', 'Misc / Repair'),
  cubePage('gem', 'Gems / Runes'),
  cubePage('rel', 'Ancient Relics'),
  cubePage('mat', 'Cubing Materials'),
  cubePage('nor', 'Normal Items'),
  cubePage('mag', 'Magic / Rare Items'),
  cubePage('uni', 'Unique Items'),
  cubePage('set', 'Set Items'),
  cubePage('old', 'Legacy Craft'),
  cubePage('new', 'Class Craft'),
  cubePage('rin', 'Rings / Amulets'),
  cubePage('cha', 'Charms'),
  cubePage('jew', 'Jewels'),
  cubePage('qui', 'Quivers'),
  cubePage('for', 'Forging'),
  cubePage('dst', 'D-Stoning'),
  cubePage('tin', 'Tinkering'),
  cubePage('bas', 'Base Upgrades'),
  cubePage('soc', 'Sockets'),
  cubePage('sec', 'Secret Recipes'),
  cubePage('tyrael', "Tyrael's Might Extra Boon"),
  { id: 'ascendancy', label: 'Ascendancies', doc: 'ascendancies.htm', anchor: null },
  { id: 'kill-ledger', label: 'Kill Ledger', doc: 'kill_ledger.htm', anchor: null },
  { id: 'weapon-mastery', label: 'Weapon Mastery', doc: 'weapon_mastery.html', anchor: null },
  { id: 'vessel', label: 'Vessel of Souls', doc: 'vessel_of_souls.htm', anchor: null },
  { id: 'other', label: 'Other recipes', doc: null, anchor: null },
];

/** Section of each guide family (CUBE_FAMILIES) */
export const GUIDE_FAMILY_SECTIONS: Readonly<Partial<Record<string, string>>> = {
  'dstone-cycle': 'mat',
  'anvil-stone': 'for',
  'remove-forging': 'for',
  'skill-forging': 'for',
  'all-skill-forging': 'for',
  'aura-forging': 'for',
  'rune-forging': 'for',
  'stat-forging': 'for',
  socket: 'soc',
  'coupon-tiers': 'rel',
  'gem-upgrade': 'gem',
  'crystal-upgrade': 'gem',
  'legendary-consumables': 'legendary',
  'respec-token': 'mis',
  'starter-pack': 'mis',
  'map-upgrade': 'uber',
  'charm-reroll': 'cha',
  'rune-conversion': 'gem',
  tinkering: 'tin',
  'uber-keys': 'uber',
  'merc-only': 'for',
  'weapon-mastery': 'weapon-mastery',
  unsocket: 'soc',
  'lucion-essence': 'soc',
  'kill-ledger-tiers': 'kill-ledger',
  'kill-ledger-bosses': 'kill-ledger',
  'ancient-scrolls': 'rel',
  'unique-charm-upgrades': 'uber',
  'maple-leaf': 'cha',
  'class-craft': 'new',
  'gem-meld': 'dst',
  ascendancy: 'ascendancy',
  'vessel-transform': 'vessel',
};

// --- families after the guide's ------------------------------------------------------------------------------------

/** The description with its numbers as `#` ("Unique: 12 Sets" → "Unique: # Sets"): one group per recipe shape */
export function descriptionShape(description: string): string {
  return description.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
}

const byShape = (row: CubeRow) => descriptionShape(row.description);

/** A named item cubed with reagents into itself (a unique or set reroll): "The same item, rerolled" */
function sameItemReroll(recipe: RecipeVariant, row: CubeRow): RecipeVariant {
  const first = row.inputs.at(0);
  const output = row.outputs.at(0);
  if (first === undefined || output === undefined || row.outputs.length !== 1 || first !== output.spec) return recipe;
  return { inputs: recipe.inputs, output: 'The same item, rerolled' };
}

/** "3× Set Quilted Armor → Quilted Armor (Unique)" as one row for every base */
function baseConversion(recipe: RecipeVariant, row: CubeRow): RecipeVariant {
  const match = /^(Unique|Set): \d+ (Sets|Uniques)$/.exec(row.description);
  const first = parseCubeCell(row.inputs[0] ?? '');
  if (match === null || row.inputs.length !== 1) return sameItemReroll(recipe, row);
  const from = match[2] === 'Sets' ? 'Set' : 'Unique';
  return { inputs: [`${String(first.qty)}× ${from} items of one base`], output: `A ${match[1].toLowerCase()} item of that base` };
}

export interface ExtraFamily extends CubeFamily {
  section: string;
}

/** Families of the cube reference after CUBE_FAMILIES (first match wins), grouped by description shape unless set */
export const EXTRA_FAMILIES: readonly ExtraFamily[] = [
  {
    id: 'unique-reroll',
    label: 'Unique rerolls',
    section: 'uni',
    match: /^(?:Eth )?Unique (?:Reroll|Weapon Reroll|Armor Reroll)\b/,
    rewrite: sameItemReroll,
    collapse: byShape,
  },
  {
    id: 'set-conversion',
    label: 'Set and unique conversions, set cycles and rerolls',
    section: 'set',
    match: /^(?:Unique: \d+ Sets|Set: \d+ Uniques|Set Conv |Set Cycle$|Set Reroll(?: \w+)?$)/,
    rewrite: baseConversion,
    collapse: byShape,
  },
  {
    id: 'rune-forging-slots',
    label: 'Rune forging on wands, staves, gloves, body armor, shields and belts',
    section: 'for',
    match: /^Rune Forging (?:wand|staf|glov|tors|shld|belt)$/,
    rewrite: genericRuneForging,
    outputBonus: 'hide',
    collapse: true,
  },
  {
    id: 'legacy-craft',
    label: 'Legacy crafts (Hit Power, Blood, Caster, Safety)',
    section: 'old',
    match: /^magic [\w' ]+ \+ jewel \+ rune \d+ \+ perfect \w+ -> \w+ \w+$/,
    collapse: (row) => /-> (\w+) \w+$/.exec(row.description)?.[1] ?? row.description,
  },
  {
    id: 'base-upgrade',
    label: 'Base upgrades and changes',
    section: 'bas',
    match: /^(?:(?:Excep|Elite) Upgrade: |Helm -> |Unique Stone \(|Belt Upgrade: )/,
    collapse: byShape,
  },
  {
    id: 'normal-items',
    label: 'Normal items, arrows and bolts',
    section: 'nor',
    match: /^(?:Normal (?:Weapon|Armor): Low |\d+ Socket \w+ ?: |Normal (?:Arrows|Bolts): )/,
    collapse: byShape,
  },
  {
    id: 'magic-rare-reroll',
    label: 'Magic and rare rerolls, starter weapons',
    section: 'mag',
    match: /^(?:(?:Eth )?(?:Magic|Rare)(?: Std)? (?:Weapon|Armor) Reroll|Magic Armor ctc |Starter Weapon for )/,
    collapse: (row) => (/^Starter Weapon/.test(row.description) ? 'Starter Weapon' : descriptionShape(row.description)),
  },
  {
    id: 'ring-amulet',
    label: 'Ring and amulet recipes',
    section: 'rin',
    match:
      /^(?:(?:All |[FCLPM] )?Resi (?:Rare|Magic) (?:Ring|Amu):|(?:DR|LL|ML) (?:Rare|Magic) Ring:|\+\d+-\d+ Tree Magic (?:Amu|Rin) |(?:\w+ )?(?:Magic|Rare|Set|Unique) (?:Ring|Amulet): )/,
    collapse: byShape,
  },
  {
    id: 'jewel-recipes',
    label: 'Jewel recipes',
    section: 'jew',
    match: /^(?:Magic|Rare|Unique) Jewel(?: Reroll)?: /,
    collapse: byShape,
  },
  {
    id: 'quiver-recipes',
    label: 'Arrow and bolt quivers',
    section: 'qui',
    match: /^(?:Magic|Rare|Unique) (?:Arrow|Bolt)(?: Reroll)?(?::|$)/,
    collapse: byShape,
  },
  {
    id: 'materials',
    label: 'Organs, Decipherers, Steaks and Dragon Stones',
    section: 'mat',
    match:
      /^(?:Decipherer: |\d+ Decipherers: \d+ Steaks|\d+ (?:Brains|Eyes|Scalps|Horns|Fangs|Jawbones|Spleens|Quills|Tails|Flags): |Steak: |Cookbook: |DS: |Dstone Transformation x\d)/,
    collapse: byShape,
  },
  {
    id: 'gem-extras',
    label: 'Blemished gems and the Mi Rune',
    section: 'gem',
    match: /^(?:P-(?:Ame|Top|Sap|Eme|Rub|Dia|Sku|Obs)|Mi Rune \(r\d+\): .+)$/,
  },
  {
    id: 'quest-items',
    label: 'Quest items and the Cow Level portal',
    section: 'mis',
    match: /^(?:Horadric Staff|Khalim's Will|Cow Portal): /,
  },
  {
    id: 'potions',
    label: 'Potions and rejuvenations',
    section: 'mis',
    match: /potion upgrade$|^(?:Full )?Rejuv Pot: |^\d+ Rejuv Pots: /,
    collapse: byShape,
  },
  {
    id: 'repair',
    label: 'Repairing, recharging and replenishing',
    section: 'mis',
    match: /^(?:Repair|Recharge|Replenish)[ /]/,
    collapse: byShape,
  },
  {
    id: 'map-portals',
    label: 'Opening map portals',
    section: 'uber',
    match: /^(?:Tier \d+ Map [A-Z]|Unique Map - |Map Recycle |Rathma's Eternal Skull )/,
    collapse: (row) => (/^(?:Tier \d+ Map|Unique Map)/.test(row.description) ? 'portal' : descriptionShape(row.description)),
  },
  {
    id: 'dstoning',
    label: 'D-Stoning (Dragon Stone forms on any item) and summon damage',
    section: 'dst',
    match: /^(?:(?:VS|BM|DS|TO|SS|HS|CG|FH) \+ Any \w+|Forging Hammer \+ Antitode )/,
    collapse: (row) => /^\w+ \+ Any (\w+)/.exec(row.description)?.[1] ?? descriptionShape(row.description),
  },
  {
    id: 'tyrael-boon',
    label: "Tyrael's Might extra boon",
    section: 'tyrael',
    match: /^Tyrael Might Aura /,
  },
  {
    id: 'primordial-soulstone',
    label: 'Primordial Soulstones and ascendancy boss bonuses',
    section: 'ascendancy',
    match: /^(?:[\w ]+ Primordial Soulstone \d+|[\w ]+ Lich King Bonus|Stance Dance Fix)$/,
    collapse: (row) => (/Lich King|Stance Dance/.test(row.description) ? 'bonus' : 'soulstone'),
    outputBonus: 'hide',
  },
  {
    id: 'secret',
    label: 'Secret recipes',
    section: 'sec',
    match: /^\[SECRET\d+\]/,
    collapse: (row) => secretNumber(row.description)?.toString() ?? row.description,
  },
];

/** `[SECRET07] …` → 7 */
export function secretNumber(description: string): number | null {
  const match = /^\[SECRET(\d+)\]/.exec(description);
  return match === null ? null : Number(match[1]);
}

/** Fallback family of a row no family matches: its description up to `:`, ` - ` or `(`, numbers as `#` */
export function fallbackPrefix(description: string): string {
  const cut = descriptionShape(description).split(/:| - |\(/)[0] ?? '';
  return cut.trim() === '' ? 'Unlabelled' : cut.trim();
}

export function fallbackFamilyId(prefix: string): string {
  return `other:${prefix
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, '-')
    .replace(/#/g, 'n')
    .replace(/^-|-$/g, '')}`;
}

/** A fallback family (grouped by description shape) */
export function fallbackFamily(prefix: string): ExtraFamily {
  return { id: fallbackFamilyId(prefix), label: prefix, section: 'other', match: /$^/, collapse: byShape };
}
