import type { ClassCode } from './schema.ts';

/** Parent codes (Equiv1/Equiv2) keyed by item type code. */
export type ParentMap = ReadonlyMap<string, readonly string[]>;

/**
 * Breadth-first ancestors of the given type codes over the Equiv graph, starting with the codes themselves.
 * Codes missing from `parents` are skipped; cycles are safe.
 */
export function ancestorsOf(codes: readonly (string | null)[], parents: ParentMap): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];
  for (const code of codes) {
    if (code !== null && code !== '') queue.push(code);
  }
  while (queue.length > 0) {
    const code = queue.shift();
    if (code === undefined || visited.has(code)) continue;
    visited.add(code);
    const ownParents = parents.get(code);
    if (ownParents === undefined) continue;
    result.push(code);
    queue.push(...ownParents);
  }
  return result;
}

/**
 * Display names that are unique across types. When several types share a name (`merc` and `helm` are both "Helm"),
 * the types without a base of their own (`withBases`: codes used as a base's type/type2) get ` (code)` appended and
 * the types with bases keep the plain name; when all or none of them have bases, all get the suffix.
 */
export function disambiguateTypeNames(
  entries: readonly { readonly code: string; readonly name: string }[],
  withBases: ReadonlySet<string> = new Set()
): Map<string, string> {
  const groups = new Map<string, string[]>();
  for (const { code, name } of entries) groups.set(name, [...(groups.get(name) ?? []), code]);
  const names = new Map<string, string>();
  for (const { code, name } of entries) {
    const group = groups.get(name) ?? [];
    const withBase = group.filter((member) => withBases.has(member)).length;
    const keepPlain = group.length === 1 || (withBase > 0 && withBase < group.length && withBases.has(code));
    names.set(code, keepPlain ? name : `${name} (${code})`);
  }
  return names;
}

/** Class restriction of a type: the first ancestor (in BFS order) that has a class set. */
export function resolveClass(ancestors: readonly string[], classes: ReadonlyMap<string, ClassCode | null>): ClassCode | null {
  for (const code of ancestors) {
    const cls = classes.get(code);
    if (cls !== undefined && cls !== null) return cls;
  }
  return null;
}
