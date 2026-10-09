import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AFFIXES_PAGE_SIZE } from '../constants/affixes';

interface AffixListProps<T> {
  readonly items: readonly T[];
  /** Renders the visible slice (lets callers group it) */
  readonly render: (visible: readonly T[]) => React.ReactNode;
}

/** Shows the first page of items and a "Show more" button adding another page. Re-mount (via `key`) to reset. */
export function AffixList<T>({ items, render }: AffixListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(AFFIXES_PAGE_SIZE);

  return (
    <>
      {render(items.slice(0, visibleCount))}
      {visibleCount < items.length && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setVisibleCount((count) => count + AFFIXES_PAGE_SIZE);
            }}
          >
            Show more ({items.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </>
  );
}
