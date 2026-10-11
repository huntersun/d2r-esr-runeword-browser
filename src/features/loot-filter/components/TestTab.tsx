import type { LootFilter } from '../engine/types';
import { PlaceholderTab } from './PlaceholderTab';

interface TestTabProps {
  readonly filter: LootFilter;
}

/** Placeholder until the test-item tab lands (it will run engine/evaluate.ts against a described item). */
export function TestTab({ filter }: TestTabProps) {
  return (
    <PlaceholderTab
      title="Test an item"
      description="Describe an item and see which rules match it, the label it gets and what is printed."
      facts={[
        { label: 'Rules to check', value: String(filter.rules.length) },
        { label: 'Filter levels', value: String(filter.filterLevels?.length ?? 0) },
      ]}
    />
  );
}
