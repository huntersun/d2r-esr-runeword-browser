import type { LootFilter } from '../engine/types';
import { PlaceholderTab } from './PlaceholderTab';

interface StylesTabProps {
  readonly filter: LootFilter;
}

/** Placeholder until the style editor lands (it will use setStyle/renameStyle/removeStyle). */
export function StylesTab({ filter }: StylesTabProps) {
  const names = Object.keys(filter.styles ?? {});
  const used = filter.rules.filter((rule) => rule.useStyle !== undefined).length;
  return (
    <PlaceholderTab
      title="Style editor"
      description="Named sets of actions that rules pull in with useStyle. Until then, edit styles in the JSON tab."
      facts={[
        { label: 'Styles', value: names.length === 0 ? '0' : `${String(names.length)} (${names.join(', ')})` },
        { label: 'Rules using a style', value: String(used) },
      ]}
    />
  );
}
