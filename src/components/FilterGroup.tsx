import type { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface FilterGroupOption {
  readonly id: string;
  readonly label: ReactNode;
  readonly checked: boolean;
}

interface FilterGroupProps {
  readonly label: string;
  /** State of the group checkbox: every, some or none of the options selected */
  readonly checked: boolean | 'indeterminate';
  readonly onToggleGroup: () => void;
  readonly options: readonly FilterGroupOption[];
  readonly onToggle: (id: string) => void;
}

/**
 * One labelled row of checkboxes ("☑ Weapons: ☑ Axe ☑ Sword …"). From `md` the label sits in a fixed column
 * with the options wrapping to its right; on phones the label gets its own line and the options wrap below it,
 * indented under the label text, so a group label never reads as one more option.
 */
export function FilterGroup({ label, checked, onToggleGroup, options, onToggle }: FilterGroupProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-3 md:grid-cols-[10rem_minmax(0,1fr)]">
      <label className="flex h-7 shrink-0 cursor-pointer items-center gap-1.5">
        <Checkbox checked={checked} onCheckedChange={onToggleGroup} />
        <span className="text-sm font-semibold">{label}:</span>
      </label>
      <div className="flex flex-wrap items-center gap-x-3 pl-5.5 md:pl-0">
        {options.map((option) => (
          <label key={option.id} className="flex h-7 cursor-pointer items-center gap-1">
            <Checkbox
              checked={option.checked}
              onCheckedChange={() => {
                onToggle(option.id);
              }}
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Vertical stack of `FilterGroup` rows with the shared spacing. */
export function FilterGroupList({ className, children }: { readonly className?: string; readonly children: ReactNode }) {
  return <div className={cn('space-y-2 md:space-y-1', className)}>{children}</div>;
}

/** The heading row above a set of filter groups: "Item Types:" followed by its All / None / Clear controls. */
export function FilterGroupHeader({ label, children }: { readonly label: string; readonly children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{label}:</span>
      {children}
    </div>
  );
}
