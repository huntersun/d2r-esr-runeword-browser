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
    else if (key === 'sock') parsed.notes.push(value === '1' ? '1 socket' : `${value} sockets`);
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
  if (parsed.token === 'usetype') {
    const quality = parsed.adjectives.length === 0 ? 'An item' : `${parsed.adjectives.join(' ')} item`;
    return { name: `${quality} of the same type`, details: notes };
  }
  const name = esr.nameOf(parsed.token);
  return { name: parsed.qty > 1 ? `${String(parsed.qty)}× ${name}` : name, details: [...parsed.adjectives, ...notes] };
}

export function formatOutput(output: CubeOutput, esr: Pick<EsrGuideTables, 'nameOf'>): string {
  const { name, details } = describeOutput(output, esr);
  return details.length === 0 ? name : `${name} (${details.join(', ')})`;
}
