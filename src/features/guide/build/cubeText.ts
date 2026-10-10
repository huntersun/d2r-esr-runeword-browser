/**
 * Readable text for cubemain input/output cells, e.g. `jewl,uni,qty=2` → "2× Unique Jewel",
 * `weap,bas,crf` → "Crafted Weapon (normal tier)", `usetype,uni` → "Unique item of the same type".
 */
import type { RecipeRow } from '../engine/schema.ts';
import type { CubeMod, CubeOutput, EsrGuideTables } from './esrGuideSources.ts';

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
    else if (key in ADJECTIVES) parsed.adjectives.push(ADJECTIVES[key] ?? key);
    else if (key in NOTES) parsed.notes.push(NOTES[key] ?? key);
  }
  return parsed;
}

function withQualifiers(adjectives: string[], name: string, notes: string[]): string {
  const text = [...adjectives, name].join(' ');
  return notes.length === 0 ? text : `${text} (${notes.join(', ')})`;
}

export function formatInput(spec: string, esr: Pick<EsrGuideTables, 'nameOf'>): string {
  const parsed = parseSpec(spec);
  const name = parsed.token === 'any' ? 'Any item' : esr.nameOf(parsed.token);
  const text = withQualifiers(parsed.adjectives, name, parsed.notes);
  return parsed.qty > 1 ? `${String(parsed.qty)}× ${text}` : text;
}

function modNotes(mods: readonly CubeMod[]): string[] {
  return mods.filter((mod) => mod.mod === 'sock').map((mod) => (mod.max === 1 ? '1 socket' : `${String(mod.max)} sockets`));
}

/** Output text plus the qualifiers on their own (for item lists). */
export function describeOutput(output: CubeOutput, esr: Pick<EsrGuideTables, 'nameOf'>): { name: string; details: string[] } {
  const parsed = parseSpec(output.spec);
  const notes = [...parsed.notes, ...modNotes(output.mods)];
  if (parsed.token === 'useitem') return { name: 'The same item', details: [...parsed.adjectives, ...notes] };
  // The input item itself with the row's mods added (e.g. Inarius' Halo: "branded"); see visibleOutputs.
  if (parsed.token === 'cloneitem') {
    const mods = output.mods.filter((mod) => mod.mod !== 'sock').map((mod) => mod.mod.charAt(0).toUpperCase() + mod.mod.slice(1));
    return { name: 'The same item', details: [...parsed.adjectives, ...notes, ...mods] };
  }
  if (parsed.token === 'usetype') {
    const quality = parsed.adjectives.length === 0 ? 'An item' : `${parsed.adjectives.join(' ')} item`;
    return { name: `${quality} of the same type`, details: notes };
  }
  const name = esr.nameOf(parsed.token);
  return { name: parsed.qty > 1 ? `${String(parsed.qty)}× ${name}` : name, details: [...parsed.adjectives, ...notes] };
}

function outputToken(output: CubeOutput): string {
  return parseCubeCell(output.spec).token;
}

/** A `cloneitem` output is the input item with the row's mods, so a `useitem` next to it is not a second item. */
export function visibleOutputs(outputs: readonly CubeOutput[]): CubeOutput[] {
  if (!outputs.some((output) => outputToken(output) === 'cloneitem')) return [...outputs];
  return outputs.filter((output) => outputToken(output) !== 'useitem');
}

export function formatOutput(output: CubeOutput, esr: Pick<EsrGuideTables, 'nameOf'>): string {
  const { name, details } = describeOutput(output, esr);
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

/**
 * Merges the variants of one recipe into as few honest rows as possible:
 * 1. variants with the same inputs but different outputs are one random pool (`pool` formats its outputs, most
 *    frequent first);
 * 2. variants with the same output that differ in exactly one input slot (always the same slot) merge into one row
 *    with that slot's values joined ("Weapon / Ring / …"); anything else stays a separate row.
 */
export function clusterVariants(variants: readonly RecipeVariant[], pool: (ranked: string[]) => string = joinOptions): RecipeVariant[] {
  const pools = new Map<string, { inputs: string[]; outputs: string[] }>();
  for (const variant of variants) {
    const key = JSON.stringify(variant.inputs);
    const entry = pools.get(key) ?? { inputs: variant.inputs, outputs: [] };
    entry.outputs.push(variant.output);
    pools.set(key, entry);
  }

  const clusters: { base: string[]; output: string; slot: number | null; values: string[] }[] = [];
  for (const { inputs, outputs } of pools.values()) {
    const output = pool(byFrequency(outputs));
    const cluster = clusters.find((candidate) => {
      if (candidate.output !== output || candidate.base.length !== inputs.length) return false;
      const diffs = inputs.flatMap((input, i) => (i !== candidate.slot && input !== candidate.base[i] ? [i] : []));
      return candidate.slot === null ? diffs.length === 1 : diffs.length === 0;
    });
    if (cluster === undefined) {
      clusters.push({ base: inputs, output, slot: null, values: [] });
      continue;
    }
    if (cluster.slot === null) {
      cluster.slot = inputs.findIndex((input, i) => input !== cluster.base[i]);
      cluster.values.push(cluster.base[cluster.slot] ?? '');
    }
    cluster.values.push(inputs[cluster.slot] ?? '');
  }
  return clusters.map(({ base, output, slot, values }) => ({
    inputs: slot === null ? base : base.map((input, i) => (i === slot ? joinOptions(values) : input)),
    output,
  }));
}

/** Rows shown per merged recipe before "… and N more" */
export const MAX_GROUP_ROWS = 3;

/** The first MAX_GROUP_ROWS rows with notes from `note(index)`; the last shown row says how many were left out. */
export function capGroup(variants: readonly RecipeVariant[], note: (index: number) => string | null): RecipeRow[] {
  const shown = variants.slice(0, MAX_GROUP_ROWS);
  const more = variants.length - shown.length;
  return shown.map((variant, i) => {
    const text = note(i);
    if (more === 0 || i !== shown.length - 1) return { ...variant, note: text };
    const rest = `… and ${String(more)} more`;
    return { ...variant, note: text === null ? rest : `${text} ${rest}` };
  });
}
