/**
 * Readable text for cubemain input/output cells, e.g. `jewl,uni,qty=2` → "2× Unique Jewel",
 * `weap,bas,crf` → "Crafted Weapon (normal tier)", `usetype,uni` → "Unique item of the same type".
 */
import type { CubeMod, CubeOutput, CubeTables } from './cubeRows.ts';

/** A merged recipe as the guide's `recipes` blocks show it (structurally the guide schema's RecipeRow) */
export interface CubeRecipeRow {
  inputs: string[];
  output: string;
  note: string | null;
}

/** Qualifiers written before the name */
const ADJECTIVES: Record<string, string> = {
  low: 'Low Quality',
  nor: 'Normal',
  hiq: 'Superior',
  mag: 'Magic',
  set: 'Set',
  rar: 'Rare',
  uni: 'Unique',
  crf: 'Crafted',
  tmp: 'Tempered',
  eth: 'Ethereal',
};

/** Qualifiers written in parentheses after the name */
const NOTES: Record<string, string> = {
  bas: 'normal tier',
  exc: 'exceptional tier',
  eli: 'elite tier',
  noe: 'not ethereal',
  nos: 'no sockets',
  nru: 'no runeword',
  upg: 'upgraded',
  rep: 'repaired',
  rch: 'recharged',
  reg: 'regenerated',
  mod: 'keeps its stats',
};

/** Note of an output with `rem` (the socketed items are removed and come out of the cube too) */
export const REMOVED_NOTE = 'socketed items come out';
/** Prefix of the note of an output's `lvl=N` */
export const ITEM_LEVEL_NOTE = 'item level ';

/** A cubemain input/output cell split into its item token, `qty=` count (default 1) and raw qualifiers. */
export interface CubeCell {
  token: string;
  qty: number;
  qualifiers: string[];
}

export function parseCubeCell(spec: string): CubeCell {
  const [token = '', ...qualifiers] = spec.split(',').map((part) => part.trim());
  const qty = Number(qualifiers.find((part) => part.startsWith('qty='))?.slice('qty='.length));
  return { token, qty: Number.isInteger(qty) && qty > 0 ? qty : 1, qualifiers };
}

interface ParsedSpec {
  token: string;
  qty: number;
  adjectives: string[];
  notes: string[];
}

function parseSpec(spec: string): ParsedSpec {
  const { token, qty, qualifiers } = parseCubeCell(spec);
  const parsed: ParsedSpec = { token, qty, adjectives: [], notes: [] };
  for (const qualifier of qualifiers) {
    const [key = '', value = ''] = qualifier.split('=');
    if (key === 'qty') continue;
    // A bare `sock` means "has sockets"; `sock=N` an exact count.
    if (key === 'sock') parsed.notes.push(value === '' ? 'socketed' : value === '1' ? '1 socket' : `${value} sockets`);
    // Output only: `useitem,rem` hands the item back with its socketables removed; `lvl=N` sets the item level
    else if (key === 'rem') parsed.notes.push(REMOVED_NOTE);
    else if (key === 'lvl' && value !== '') parsed.notes.push(`${ITEM_LEVEL_NOTE}${value}`);
    else if (key in ADJECTIVES) parsed.adjectives.push(ADJECTIVES[key] ?? key);
    else if (key in NOTES) parsed.notes.push(NOTES[key] ?? key);
  }
  return parsed;
}

function withQualifiers(adjectives: string[], name: string, notes: string[]): string {
  const text = [...adjectives, name].join(' ');
  return notes.length === 0 ? text : `${text} (${notes.join(', ')})`;
}

export function formatInput(spec: string, esr: Pick<CubeTables, 'nameOf'>): string {
  const parsed = parseSpec(spec);
  const name = parsed.token === 'any' ? 'Any item' : esr.nameOf(parsed.token);
  const text = withQualifiers(parsed.adjectives, name, parsed.notes);
  return parsed.qty > 1 ? `${String(parsed.qty)}× ${text}` : text;
}

function modNotes(mods: readonly CubeMod[]): string[] {
  return mods.filter((mod) => mod.mod === 'sock').map((mod) => (mod.max === 1 ? '1 socket' : `${String(mod.max)} sockets`));
}

/**
 * Output mods that are markers or counters rather than a bonus, by property code. The stat renderer shows several
 * of them: craftflag "*** Forged (Equipment) ***", craftflag2 "*** Forged (Jewel) ***", mercflag "*** Merc Only
 * Conversion ***", item-upgraded "*** Upgraded ***", weapon-mastery "Weapon Mastery Applied", sanctified-dummy
 * "Transmute to Sanctify Item", anointed_dummy / corrupted_dummy "Transmute to Anoint / Corrupt Item", mythicaldesc
 * (the mythical's description lines), soul-counter "Souls Remaining: -350", unusable-item "This item cannot be
 * equipped", and the stocker counters ("Anvil Stone 1", "Ruby -243", "Frozen Soul 50", "Ring Point -7"). Others
 * render nothing (no description function): tinkerflag2, meldflag, randomize, kill-ledger-*, ascendancy-tier-*, the
 * *-cap stats; they are listed anyway so a later descfunc does not surface them. `sock` is written as "N sockets".
 */
const HIDDEN_MODS = new Set([
  'sock',
  'craftflag',
  'craftflag2',
  'tinkerflag2',
  'mercflag',
  'meldflag',
  'item-upgraded',
  'weapon-mastery',
  'sanctified-dummy',
  'anointed_dummy',
  'corrupted_dummy',
  'mythicaldesc',
  'soul-counter',
  'unusable-item',
  'randomize',
]);
/** Kill Ledger and ascendancy tier markers, stocker counters (item-NN, junk-NN, xtal-NN, rune-…, gem-x), caps */
const HIDDEN_MOD_PATTERN = /^(?:kill-ledger-|ascendancy-tier-|(?:item|junk|xtal)-\d+$|rune-|gem-[a-z]$)|-cap(?:-group)?$/;

export function isHiddenMod(code: string): boolean {
  return HIDDEN_MODS.has(code) || HIDDEN_MOD_PATTERN.test(code);
}

/** What describing an output reads: display names and the bonus text of its mods */
export type OutputTables = Pick<CubeTables, 'nameOf' | 'renderMods' | 'levelName'>;

export interface DescribeOptions {
  /** Render the output's bonus mods (default true); families with one bonus per ingredient hide them */
  bonus?: boolean;
}

/** The bonus lines of an output's mods through the game-data stat renderer ("+5 to Life"), markers left out */
export function bonusLines(mods: readonly CubeMod[], esr: Pick<OutputTables, 'renderMods'>): string[] {
  const shown = mods.filter((mod) => !isHiddenMod(mod.mod));
  return shown.length === 0 ? [] : esr.renderMods(shown);
}

/** Output text plus the qualifiers on their own (for item lists). */
export function describeOutput(output: CubeOutput, esr: OutputTables, options: DescribeOptions = {}): { name: string; details: string[] } {
  const parsed = parseSpec(output.spec);
  const notes = [...parsed.notes, ...modNotes(output.mods), ...(options.bonus === false ? [] : bonusLines(output.mods, esr))];
  if (parsed.token === 'useitem') return { name: 'The same item', details: [...parsed.adjectives, ...notes] };
  // A copy of input 1 (launcher plugin output code) with the row's mods added to the copy (e.g. Inarius' Halo:
  // "Branded"); a `useitem` next to it hands back the original as well.
  if (parsed.token === 'cloneitem') return { name: 'A copy of the item', details: [...parsed.adjectives, ...notes] };
  if (parsed.token === 'usetype') {
    const quality = parsed.adjectives.length === 0 ? 'An item' : `${parsed.adjectives.join(' ')} item`;
    return { name: `${quality} of the same type`, details: notes };
  }
  const name = esr.nameOf(parsed.token);
  // A Red Portal's `lvl=` is the levels.txt id of the map it opens, not an item level
  const levelName = esr.levelName;
  const shown = parsed.token === 'Red Portal' && levelName !== undefined ? notes.map((note) => portalNote(note, levelName)) : notes;
  return { name: parsed.qty > 1 ? `${String(parsed.qty)}× ${name}` : name, details: [...parsed.adjectives, ...shown] };
}

function portalNote(note: string, levelName: (id: number) => string | null): string {
  if (!note.startsWith(ITEM_LEVEL_NOTE)) return note;
  const level = levelName(Number(note.slice(ITEM_LEVEL_NOTE.length)));
  return level === null ? note : `to ${level}`;
}

export function formatOutput(output: CubeOutput, esr: OutputTables, options: DescribeOptions = {}): string {
  const { name, details } = describeOutput(output, esr, options);
  return details.length === 0 ? name : `${name} (${details.join(', ')})`;
}

// ---------------------------------------------------------------------------
// Collapsing the mechanical variants of a recipe (one row per base type, quality, class or socket count) into one row.
// ---------------------------------------------------------------------------

/** Variants shown per input position / for the output before "…" */
const MAX_OPTIONS = 3;

export function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** "a / b / c / … (7 variants)" */
export function joinOptions(values: readonly string[]): string {
  const options = distinct(values);
  if (options.length <= MAX_OPTIONS) return options.join(' / ');
  return `${options.slice(0, MAX_OPTIONS).join(' / ')} / … (${String(options.length)} variants)`;
}

export interface RecipeVariant {
  inputs: string[];
  output: string;
}

/** Occurrences per distinct value, in first-seen order */
export function countValues(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

/** Distinct values, most frequent first (ties in first-seen order) */
function byFrequency(values: readonly string[]): string[] {
  return [...countValues(values)].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}

/** A random pool with more options than this is counted rather than listed (when the options share their name) */
export const MAX_POOL_OPTIONS = 6;

/**
 * The default random pool: "a / b / c / … (N variants)"; a larger pool of one item with different bonuses (the 217
 * sanctifications of a jewel) reads "The same item (one random bonus, 217 possible)".
 */
export function randomPool(ranked: string[]): string {
  if (ranked.length <= MAX_POOL_OPTIONS) return joinOptions(ranked);
  const names = distinct(ranked.map((option) => option.replace(/ \(.*\)$/, '')));
  const name = names.at(0);
  if (names.length !== 1 || name === undefined) return joinOptions(ranked);
  return `${name} (one random bonus, ${String(ranked.length)} possible)`;
}

/**
 * Merges the variants of one recipe into as few honest rows as possible:
 * 1. variants with the same inputs but different outputs are one random pool (`pool` formats its outputs, most
 *    frequent first; default randomPool);
 * 2. variants with the same output that differ in exactly one input slot (always the same slot) merge into one row
 *    with that slot's values joined ("Weapon / Ring / …"); anything else stays a separate row.
 */
export function clusterVariants(variants: readonly RecipeVariant[], pool: (ranked: string[]) => string = randomPool): RecipeVariant[] {
  return clusterVariantsCounted(variants, pool).map(({ variant }) => variant);
}

/** A merged row and the number of variants (txt rows) merged into it */
export interface CountedVariant {
  variant: RecipeVariant;
  count: number;
}

/** clusterVariants, counting the variants each merged row stands for */
export function clusterVariantsCounted(
  variants: readonly RecipeVariant[],
  pool: (ranked: string[]) => string = randomPool
): CountedVariant[] {
  const pools = new Map<string, { inputs: string[]; outputs: string[] }>();
  for (const variant of variants) {
    const key = JSON.stringify(variant.inputs);
    const entry = pools.get(key) ?? { inputs: variant.inputs, outputs: [] };
    entry.outputs.push(variant.output);
    pools.set(key, entry);
  }

  const clusters: { base: string[]; output: string; slot: number | null; values: string[]; count: number }[] = [];
  for (const { inputs, outputs } of pools.values()) {
    const output = pool(byFrequency(outputs));
    const cluster = clusters.find((candidate) => {
      if (candidate.output !== output || candidate.base.length !== inputs.length) return false;
      const diffs = inputs.flatMap((input, i) => (i !== candidate.slot && input !== candidate.base[i] ? [i] : []));
      return candidate.slot === null ? diffs.length === 1 : diffs.length === 0;
    });
    if (cluster === undefined) {
      clusters.push({ base: inputs, output, slot: null, values: [], count: outputs.length });
      continue;
    }
    cluster.count += outputs.length;
    if (cluster.slot === null) {
      cluster.slot = inputs.findIndex((input, i) => input !== cluster.base[i]);
      cluster.values.push(cluster.base[cluster.slot] ?? '');
    }
    cluster.values.push(inputs[cluster.slot] ?? '');
  }
  return clusters.map(({ base, output, slot, values, count }) => ({
    variant: {
      inputs: slot === null ? base : base.map((input, i) => (i === slot ? joinOptions(values) : input)),
      output,
    },
    count,
  }));
}

/** Rows shown per merged recipe before "… and N more" */
export const MAX_GROUP_ROWS = 3;

/**
 * Clusters a recipe's variants with their output bonus, unless the bonuses split it into more rows than are shown
 * (e.g. one per organ): then the variants without the bonus (`plain`, same order), which merge as before.
 */
export function clusterWithBonus(
  withBonus: readonly RecipeVariant[],
  plain: readonly RecipeVariant[],
  pool?: (ranked: string[]) => string
): RecipeVariant[] {
  return clusterWithBonusCounted(withBonus, plain, pool).map(({ variant }) => variant);
}

/** clusterWithBonus, counting the variants each merged row stands for */
export function clusterWithBonusCounted(
  withBonus: readonly RecipeVariant[],
  plain: readonly RecipeVariant[],
  pool?: (ranked: string[]) => string
): CountedVariant[] {
  const rows = clusterVariantsCounted(withBonus, pool);
  return rows.length > MAX_GROUP_ROWS ? clusterVariantsCounted(plain, pool) : rows;
}

/** The first MAX_GROUP_ROWS rows with notes from `note(index)`; the last shown row says how many were left out. */
export function capGroup(variants: readonly RecipeVariant[], note: (index: number) => string | null): CubeRecipeRow[] {
  const shown = variants.slice(0, MAX_GROUP_ROWS);
  const more = variants.length - shown.length;
  return shown.map((variant, i) => {
    const text = note(i);
    if (more === 0 || i !== shown.length - 1) return { ...variant, note: text };
    const rest = `… and ${String(more)} more`;
    return { ...variant, note: text === null ? rest : `${text} ${rest}` };
  });
}
