import { isPlainObject } from '../engine/parse';

/** A shallow patch: a key with an `undefined` value is removed, any other value replaces the key. */
export type ShallowPatch<T> = { readonly [K in keyof T]?: T[K] | undefined };

/**
 * Applies `patch` to `target` (a new object; `target` is not changed). A patched key is also dropped from
 * `target.passthrough` when there is one: the user set (or cleared) it in a form, so a wrong-shaped original
 * must not come back on download.
 */
export function applyPatch<T extends object>(target: T, patch: ShallowPatch<T>): T {
  const patchEntries: [string, unknown][] = Object.entries(patch);
  const patchedKeys = patchEntries.map(([key]) => key);
  const out: Record<string, unknown> = Object.fromEntries([
    ...Object.entries(target).filter(([key]) => !patchedKeys.includes(key)),
    ...patchEntries.filter(([, value]) => value !== undefined),
  ]);
  const passthrough = out.passthrough;
  if (!patchedKeys.includes('passthrough') && isPlainObject(passthrough) && patchedKeys.some((key) => key in passthrough)) {
    const kept = Object.fromEntries(Object.entries(passthrough).filter(([key]) => !patchedKeys.includes(key)));
    const { passthrough: _dropped, ...rest } = out;
    // `rest`/`out` hold the keys of T with values of the patched types.
    return (Object.keys(kept).length > 0 ? { ...rest, passthrough: kept } : rest) as T;
  }
  return out as T;
}
