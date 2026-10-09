import type { BaseItem } from '../engine/schema';
import type { EligibleAffixes, WeightedAffix } from '../engine/affixEligibility';
import type { AffixFilters } from '../store/gameDataSlice';
import { filterRollable, formatWeight, groupRollable } from '../utils/filterAffixes';
import { AffixCard } from './AffixCard';
import { AffixList } from './AffixList';

interface AffixRollResultsProps {
  readonly base: BaseItem;
  readonly eligible: EligibleAffixes;
  readonly filters: AffixFilters;
  readonly typeNames: ReadonlyMap<string, string>;
  readonly classNames: ReadonlyMap<string, string>;
}

/** What-can-roll results: prefixes and suffixes side by side, automods below, each grouped by affix group. */
export function AffixRollResults({ base, eligible, filters, typeNames, classNames }: AffixRollResultsProps) {
  const sectionProps = { filters, typeNames, classNames };
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Sorted by affix group, then level. Only one affix per group can be on an item; percentages are the chance among the eligible affixes
        of the same kind.
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RollSection title="Prefixes" rollable={eligible.prefixes} {...sectionProps} />
        <RollSection title="Suffixes" rollable={eligible.suffixes} {...sectionProps} />
      </div>
      {filters.includeAutomagic &&
        (base.autoGroup === null ? (
          <p className="text-sm text-muted-foreground">{base.name} has no automod pool.</p>
        ) : (
          <RollSection title={`Automods (group ${String(base.autoGroup)})`} rollable={eligible.automagic} {...sectionProps} />
        ))}
    </div>
  );
}

interface RollSectionProps {
  readonly title: string;
  readonly rollable: readonly WeightedAffix[];
  readonly filters: AffixFilters;
  readonly typeNames: ReadonlyMap<string, string>;
  readonly classNames: ReadonlyMap<string, string>;
}

function RollSection({ title, rollable, filters, typeNames, classNames }: RollSectionProps) {
  const shown = filterRollable(rollable, filters);

  return (
    <section className="min-w-0 space-y-3">
      <h2 className="text-lg font-semibold">
        {title}{' '}
        <span className="text-sm font-normal text-muted-foreground">
          {shown.length === rollable.length
            ? `${String(rollable.length)} eligible`
            : `${String(shown.length)} of ${String(rollable.length)} eligible`}
        </span>
      </h2>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing can roll here with the current filters.</p>
      ) : (
        <AffixList
          // Re-mount (and reset "Show more") whenever the filters change
          key={JSON.stringify(filters)}
          items={shown}
          render={(visible) =>
            groupRollable(visible).map((group) => (
              <div key={group.group} className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Group {group.group} · {formatWeight(group.weight)} · one affix per group
                </h3>
                {group.affixes.map(({ affix, weight }) => (
                  <div key={`${affix.kind}-${String(affix.id)}`} className="card-visibility-auto">
                    <AffixCard affix={affix} weight={weight} typeNames={typeNames} classNames={classNames} />
                  </div>
                ))}
              </div>
            ))
          }
        />
      )}
    </section>
  );
}
