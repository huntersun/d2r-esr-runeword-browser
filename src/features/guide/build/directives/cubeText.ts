/**
 * Readable text for cubemain input/output cells, e.g. `jewl,uni,qty=2` → "2× Unique Jewel",
 * `weap,bas,crf` → "Crafted Weapon (normal tier)", `usetype,uni` → "Unique item of the same type".
 */
import type { CubeMod, CubeOutput, EsrGuideTables } from '../esrGuideSources.ts';

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

interface ParsedSpec {
  token: string;
  qty: number;
  adjectives: string[];
  notes: string[];
}

function parseSpec(spec: string): ParsedSpec {
  const [token = '', ...qualifiers] = spec.split(',').map((part) => part.trim());
  const parsed: ParsedSpec = { token, qty: 1, adjectives: [], notes: [] };
  for (const qualifier of qualifiers) {
    const [key = '', value = ''] = qualifier.split('=');
    if (key === 'qty') parsed.qty = Number(value) || 1;
    // A bare `sock` means "has sockets"; `sock=N` an exact count.
    else if (key === 'sock') parsed.notes.push(value === '' ? 'socketed' : value === '1' ? '1 socket' : `${value} sockets`);
    else if (key in ADJECTIVES) parsed.adjectives.push(ADJECTIVES[key] ?? key);
    else if (key in NOTES) parsed.notes.push(NOTES[key] ?? key);
  }
  return parsed;
}

function join(adjectives: string[], name: string, notes: string[]): string {
  const text = [...adjectives, name].join(' ');
  return notes.length === 0 ? text : `${text} (${notes.join(', ')})`;
}

export function formatInput(spec: string, esr: Pick<EsrGuideTables, 'nameOf'>): string {
  const parsed = parseSpec(spec);
  const name = parsed.token === 'any' ? 'Any item' : esr.nameOf(parsed.token);
  const text = join(parsed.adjectives, name, parsed.notes);
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
  return output.spec.split(',')[0]?.trim() ?? '';
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

export function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** "a / b / c / … (7 variants)" */
export function options(values: readonly string[]): string {
  const distinct = unique(values);
  if (distinct.length <= MAX_OPTIONS) return distinct.join(' / ');
  return `${distinct.slice(0, MAX_OPTIONS).join(' / ')} / … (${String(distinct.length)} variants)`;
}

/** Position-wise " / " join when every variant has the same number of inputs; otherwise the first variant. */
export function mergeInputs(variants: readonly string[][]): string[] {
  const first = variants[0] ?? [];
  if (variants.some((inputs) => inputs.length !== first.length)) return first;
  return first.map((_, i) => options(variants.map((inputs) => inputs[i] ?? '')));
}
