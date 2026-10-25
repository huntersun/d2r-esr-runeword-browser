import type { ItemIconRef } from '@/features/game-data/hooks/useItemIcons';
import type { SocketableCategory, UnifiedSocketable } from '../types';

/**
 * misc.txt codes of the socketable names two categories share with different art (icons.json keys them
 * `name#code`). ESR 3.2.24: only Ko Rune, an ESR rune (r19) and a LoD rune (r68).
 * socketableIconMatching.integration.test.ts fails when icons.json splits a name this map does not cover.
 */
const SHARED_NAME_CODES: Partial<Record<SocketableCategory, Readonly<Record<string, string>>>> = {
  esrRunes: { 'Ko Rune': 'r19' },
  lodRunes: { 'Ko Rune': 'r68' },
};

/** The icon lookup of a socketable: its misc item name, plus the code when another category shares the name. */
export function socketableIconRef({ name, category }: Pick<UnifiedSocketable, 'name' | 'category'>): ItemIconRef & { kind: 'misc' } {
  const codes = SHARED_NAME_CODES[category];
  const code = codes !== undefined && Object.hasOwn(codes, name) ? codes[name] : undefined;
  return code === undefined ? { kind: 'misc', name } : { kind: 'misc', name, code };
}
