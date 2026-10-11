import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LOCATIONS, type ItemLocation } from '../../../engine/types';

const LOCATION_LABELS: Readonly<Record<ItemLocation, string>> = {
  onGround: 'On the ground',
  stored: 'Stored',
  equipped: 'Equipped',
  atVendor: 'At a vendor',
};

interface LocationControlProps {
  readonly id: string;
  readonly value: readonly ItemLocation[] | undefined;
  /** None ticked = `undefined` (the default, on the ground). */
  readonly onChange: (value: readonly ItemLocation[] | undefined) => void;
}

/** One checkbox per location; the list is kept in the guide's order. */
export function LocationControl({ id, value, onChange }: LocationControlProps) {
  const current = value ?? [];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {LOCATIONS.map((location) => {
        const checkboxId = `${id}-${location}`;
        return (
          <div key={location} className="flex items-center gap-1.5">
            <Checkbox
              id={checkboxId}
              checked={current.includes(location)}
              onCheckedChange={(checked) => {
                const next = LOCATIONS.filter((item) => (item === location ? checked === true : current.includes(item)));
                onChange(next.length === 0 ? undefined : next);
              }}
            />
            <Label htmlFor={checkboxId} className="font-normal">
              {LOCATION_LABELS[location]}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
