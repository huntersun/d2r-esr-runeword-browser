import type { LootFilter } from '../engine/types';
import { PlaceholderTab } from './PlaceholderTab';

interface RulesTabProps {
  readonly filter: LootFilter;
  readonly selectedRule: number | null;
}

/** Placeholder until the rule builder lands (it will use addRule/patchRule/moveRule/… and `selectedRule`). */
export function RulesTab({ filter, selectedRule }: RulesTabProps) {
  const ruleCount = filter.rules.length;
  const hidden = filter.rules.filter((rule) => rule.hide === true).length;
  return (
    <PlaceholderTab
      title="Rule builder"
      description="Rules will be listed, reordered and edited here with item pickers. Until then, edit rules in the JSON tab."
      facts={[
        { label: 'Rules', value: String(ruleCount) },
        { label: 'Hiding rules', value: String(hidden) },
        { label: 'Selected', value: selectedRule === null ? 'none' : `Rule ${String(selectedRule + 1)}` },
      ]}
    />
  );
}
