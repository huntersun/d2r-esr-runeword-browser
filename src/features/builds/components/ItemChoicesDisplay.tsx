import type { EquipmentSlot, ItemRef, RunewordItemRef, WeaponSwapSlot } from '../buildData';
import { useRunewordBases } from '../hooks/useRunewordBases';
import { useSocketFillerCatalog } from '../hooks/useSocketFillerCatalog';
import { slotToColumn } from '../utils/buildSnapshot';
import { hasItemChoices, socketedOf } from '../utils/itemChoices';
import { baseSummary } from '../utils/runewordBases';
import { fillerBonusLines } from '../utils/socketFillers';

interface ItemChoicesDisplayProps {
  readonly item: ItemRef;
  readonly slot: EquipmentSlot | WeaponSwapSlot;
}

/** Read-only author choices under an item card: the runeword base, then the socket fillers with their bonuses. */
export function ItemChoicesDisplay({ item, slot }: ItemChoicesDisplayProps) {
  if (!hasItemChoices(item)) return null;
  return (
    <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      {item.type === 'runeword' && item.base !== undefined && <RunewordBaseLine item={item} />}
      {socketedOf(item).length > 0 && <SocketedLines fillers={socketedOf(item)} slot={slot} />}
    </div>
  );
}

function RunewordBaseLine({ item }: { readonly item: RunewordItemRef }) {
  const state = useRunewordBases(item);
  const label =
    state.status === 'ready' && state.chosenBase !== undefined ? baseSummary(state.chosenBase, state.typeNames) : (item.base?.name ?? '');
  return (
    <p>
      <span className="text-xs font-medium text-muted-foreground">Base: </span>
      {label}
    </p>
  );
}

function SocketedLines({ fillers, slot }: { readonly fillers: readonly string[]; readonly slot: EquipmentSlot | WeaponSwapSlot }) {
  const catalog = useSocketFillerCatalog();
  const column = slotToColumn(slot);
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">Socketed:</p>
      <ul className="space-y-0.5">
        {fillers.map((filler, index) => {
          const lines = catalog === undefined ? null : fillerBonusLines(filler, catalog, column);
          return (
            <li key={`${String(index)}:${filler}`}>
              {filler}
              {lines !== null && lines.length > 0 && <span className="block text-xs text-muted-foreground">{lines.join(', ')}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
