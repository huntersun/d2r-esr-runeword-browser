import { supportsSocketed, type ItemRef, type RunewordBaseChoice, type RunewordItemRef, type SocketableItemRef } from '../buildData';

/** The ref with `socketed` set to the fillers, or removed when there are none (no empty arrays are stored). */
export function withSocketed<T extends SocketableItemRef>(item: T, socketed: readonly string[]): T {
  const { socketed: _previous, ...rest } = item;
  return (socketed.length > 0 ? { ...rest, socketed } : rest) as T;
}

/** The runeword ref with `base` set, or removed when undefined. */
export function withBase(item: RunewordItemRef, base: RunewordBaseChoice | undefined): RunewordItemRef {
  const { base: _previous, ...rest } = item;
  return base === undefined ? rest : { ...rest, base };
}

/** The ref's socket fillers ([] for refs that cannot carry them). */
export function socketedOf(item: ItemRef): readonly string[] {
  return supportsSocketed(item) ? (item.socketed ?? []) : [];
}

/** Whether a ref carries any author choice (a runeword base or socket fillers). */
export function hasItemChoices(item: ItemRef): boolean {
  return (item.type === 'runeword' && item.base !== undefined) || socketedOf(item).length > 0;
}
