import type { BaseItem, ItemTypeInfo } from './schema.ts';

type Thresholds = ItemTypeInfo['thresholds'];
type SocketBase = Pick<BaseItem, 'socketCaps'>;

/** Socket band for an item level: 0 if `ilvl ≤ t1`, 1 if `ilvl ≤ t2`, else 2. */
export function socketBand(ilvl: number, thresholds: Thresholds): 0 | 1 | 2 {
  if (ilvl <= thresholds[0]) return 0;
  if (ilvl <= thresholds[1]) return 1;
  return 2;
}

/**
 * Maximum sockets the base can roll at the given item level.
 * `thresholds` come from the base's own `type` (`types[base.type].thresholds`).
 */
export function socketCapAt(base: SocketBase, ilvl: number, thresholds: Thresholds): number {
  return base.socketCaps[socketBand(ilvl, thresholds)];
}

/** Lowest item level at which the base can roll `n` sockets, or null if it never can. */
export function minIlvlForSockets(base: SocketBase, n: number, thresholds: Thresholds): number | null {
  const lowerBounds = [1, thresholds[0] + 1, thresholds[1] + 1];
  const band = base.socketCaps.findIndex((cap) => cap >= n);
  return band === -1 ? null : (lowerBounds[band] ?? null);
}
