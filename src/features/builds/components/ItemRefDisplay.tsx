import { ItemIcon } from '@/features/game-data/components/ItemIcon';
import type { EquipmentSlot, ItemRef, WeaponSwapSlot } from '../buildData';
import { slotToColumn } from '../utils/buildSnapshot';
import { SET_NAME_CLASS } from '../utils/setItems';
import { SetPartialGroups } from './SetItemBuildCard';

interface ItemRefDisplayProps {
  readonly item: ItemRef;
  readonly slot: EquipmentSlot | WeaponSwapSlot;
  /** Set items only: pieces of the set equipped in this section (marks the partial groups active/inactive). */
  readonly setPieces?: number;
}

function AffixList({ lines }: { readonly lines: readonly string[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
      {lines.map((line, index) => (
        <li key={`${String(index)}:${line}`}>{line}</li>
      ))}
    </ul>
  );
}

/** Renders a single item reference (name + stats) for the build detail page. */
export function ItemRefDisplay({ item, slot, setPieces }: ItemRefDisplayProps) {
  if (item.type === 'freetext') {
    return (
      <p className="text-sm font-medium">
        {item.name} <span className="text-xs font-normal text-muted-foreground">(custom)</span>
      </p>
    );
  }

  if (item.type === 'unique' || item.type === 'mythical') {
    return (
      <div>
        <div className="flex min-w-0 items-start gap-2">
          <ItemIcon item={{ kind: 'unique', name: item.snapshot.name }} size={32} className="rounded bg-muted/50" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{item.snapshot.name}</p>
            <p className="text-xs text-muted-foreground">{item.snapshot.baseItem}</p>
          </div>
        </div>
        <AffixList lines={[...(item.snapshot.specialProperties ?? []), ...item.snapshot.properties]} />
      </div>
    );
  }

  if (item.type === 'set') {
    const { snapshot } = item;
    return (
      <div className="space-y-1">
        <div className="flex min-w-0 items-start gap-2">
          <ItemIcon item={{ kind: 'set', name: snapshot.name }} size={32} className="rounded bg-muted/50" />
          <div className="min-w-0">
            <p className={`text-sm font-medium ${SET_NAME_CLASS}`}>{snapshot.name}</p>
            <p className="text-xs text-muted-foreground">
              Set: {snapshot.setName} · {snapshot.baseItem} · Req Lvl {snapshot.reqLevel}
            </p>
          </div>
        </div>
        <AffixList lines={snapshot.properties} />
        <SetPartialGroups groups={snapshot.partial} equippedPieces={setPieces} />
      </div>
    );
  }

  // Runeword or gemword: show the recipe and the bonus column for this slot.
  const recipe = item.type === 'runeword' ? item.snapshot.runes : item.snapshot.gems;
  const affixes = item.snapshot.columnAffixes[slotToColumn(slot)];
  return (
    <div>
      <p className="text-sm font-medium">
        {item.name} <span className="text-xs font-normal text-muted-foreground">({recipe.join(' ')})</span>
      </p>
      <AffixList lines={affixes} />
    </div>
  );
}
