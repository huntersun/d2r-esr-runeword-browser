import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import type { BaseItem } from '@/features/game-data/engine/schema';
import { useGameData } from '@/features/game-data/hooks/useGameData';
import type { RunewordItemRef } from '../buildData';
import {
  allGearBases,
  basesForSlot,
  rowsForBase,
  runewordBaseCandidates,
  typeNameMap,
  type RunewordBaseCandidates,
} from '../utils/runewordBases';
import type { PickerSlot } from '../utils/slotFit';
import { runewordJewelSockets } from '../utils/sockets';

export type RunewordBasesState =
  | { readonly status: 'loading' }
  /** The game-data bundles failed to load: no base list, jewel sockets from the local recipe. */
  | { readonly status: 'unavailable'; readonly jewelSockets: number }
  | (RunewordBaseCandidates & {
      readonly status: 'ready';
      readonly typeNames: ReadonlyMap<string, string>;
      /** The stored base, resolved in bases.json (undefined when none is chosen or the code is unknown) */
      readonly chosenBase: BaseItem | undefined;
      /** Free (jewel) sockets, narrowed to the rows the chosen base can hold */
      readonly jewelSockets: number;
    });

/**
 * Base candidates and free jewel sockets for a runeword ref: the local recipe (Dexie,
 * falling back to the saved snapshot when the runeword is gone) matched against the
 * runewords / bases / types game-data bundles. A failed bundle load never throws.
 */
export function useRunewordBases(ref: RunewordItemRef, slot: PickerSlot): RunewordBasesState {
  const game = useGameData(['bases', 'types', 'runewords']);
  const sameName = useLiveQuery(() => db.runewords.where('name').equals(ref.name).toArray(), [ref.name]);
  if (sameName === undefined) return { status: 'loading' };

  const local = sameName.find((runeword) => runeword.variant === ref.variant);
  const recipe = local ?? { sockets: ref.snapshot.sockets, socketsMax: ref.snapshot.socketsMax };
  if (game.status === 'loading') return { status: 'loading' };
  if (game.status === 'error') return { status: 'unavailable', jewelSockets: runewordJewelSockets(recipe) };

  const { bases, types, runewords } = game.data;
  const typeNames = typeNameMap(types);
  const result =
    local !== undefined
      ? runewordBaseCandidates(local, { bases, types, runewords }, sameName)
      : { rows: [], candidates: allGearBases({ bases, types }), unmatched: true };
  const chosenCode = ref.base?.code;
  const chosenBase = chosenCode === undefined ? undefined : bases.bases.find((base) => base.code === chosenCode);
  const baseRows = chosenBase === undefined ? [] : rowsForBase(result.rows, chosenBase);
  const jewelSockets = runewordJewelSockets(recipe, baseRows.length > 0 ? baseRows : result.rows);
  // The picker offers only the bases that belong in this slot (a Sword / Any Shield recipe in a shield slot: shields).
  return { status: 'ready', ...result, candidates: basesForSlot(result.candidates, slot, typeNames), typeNames, chosenBase, jewelSockets };
}
