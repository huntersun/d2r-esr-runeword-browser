import type { MythicalUnique } from '@/core/db';

/**
 * Max required level filter. Items without a parsed "Required Level" (reqLevel 0,
 * see mythicalUniquesParser) are always visible so a missing value never hides an item.
 */
export function matchesMaxReqLevel(item: Pick<MythicalUnique, 'reqLevel'>, maxReqLevel: number | null): boolean {
  if (maxReqLevel === null) return true;
  if (item.reqLevel <= 0) return true;
  return item.reqLevel <= maxReqLevel;
}
