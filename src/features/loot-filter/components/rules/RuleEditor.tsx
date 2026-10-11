import { useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ACTION_KEYS } from '../../engine/parse';
import type { Diagnostic, LootFilter, LootFilterRule, RuleActions } from '../../engine/types';
import type { LootFilterData } from '../../hooks/useLootFilterData';
import { patchRule } from '../../store/lootFilterSlice';
import type { ShallowPatch } from '../../utils/patch';
import { BASE_TIER_SCALE, DIFFICULTY_SCALE, QUALITY_SCALE } from '../../utils/ruleSummary';
import { ActionsEditor } from '../actions/ActionsEditor';
import { AreaPicker, ItemPicker, ItemTypePicker, UniqueOrSetPicker } from '../pickers';
import { ConditionField, ConditionSection } from './conditions/ConditionField';
import { LevelsControl } from './conditions/LevelsControl';
import { LocationControl } from './conditions/LocationControl';
import { NamedMatchControl } from './conditions/NamedMatchControl';
import { NumberMatchControl } from './conditions/NumberMatchControl';
import { StatCheckList } from './conditions/StatCheckList';
import { TriStateControl } from './conditions/TriStateControl';
import { RuleDiagnostics } from './RuleDiagnostics';

export const RULE_EDITOR_ID = 'loot-filter-rule-editor';

/** The rule's action keys (what `ActionsEditor` edits). */
function pickActions(rule: LootFilterRule): RuleActions {
  const actions: RuleActions = Object.fromEntries(ACTION_KEYS.filter((key) => rule[key] !== undefined).map((key) => [key, rule[key]]));
  return actions;
}

/** A list condition: an emptied list removes the key. */
function listOrUndefined<T>(list: readonly T[]): readonly T[] | undefined {
  return list.length === 0 ? undefined : list;
}

const FLAGS = [
  { key: 'isEthereal', label: 'Ethereal' },
  { key: 'isRuneword', label: 'Runeword' },
  { key: 'isIdentified', label: 'Identified' },
  { key: 'isFullySocketed', label: 'Fully socketed' },
] as const;

interface RuleEditorProps {
  readonly filter: LootFilter;
  readonly index: number;
  readonly rule: LootFilterRule;
  readonly diagnostics: readonly Diagnostic[];
  readonly data: LootFilterData;
}

/** Comment, problems, every condition of the guide, then the actions. Every change dispatches `patchRule`. */
export function RuleEditor({ filter, index, rule, diagnostics, data }: RuleEditorProps) {
  const dispatch = useDispatch();
  const patch = (value: ShallowPatch<LootFilterRule>) => dispatch(patchRule({ index, patch: value }));
  const passthroughKeys = Object.keys(rule.passthrough ?? {});
  const invalid = (key: string) => passthroughKeys.includes(key);
  const field = (key: string) => `rule-${key}`;

  return (
    <div id={RULE_EDITOR_ID} className="scroll-mt-4 space-y-4">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Rule {index + 1}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-comment">Comment</Label>
            <Input
              id="rule-comment"
              value={rule.comment ?? ''}
              placeholder="A note for yourself; the game ignores it"
              onChange={(event) => patch({ comment: event.target.value === '' ? undefined : event.target.value })}
            />
          </div>

          <RuleDiagnostics index={index} diagnostics={diagnostics} />

          <ConditionSection title="Which items">
            <ConditionField
              id={field('itemCodes')}
              label="Item codes"
              hint="Any of these items. Empty = every item."
              invalid={invalid('itemCodes')}
            >
              <ItemPicker
                id={field('itemCodes')}
                data={data}
                values={rule.itemCodes ?? []}
                onChange={(codes) => patch({ itemCodes: listOrUndefined(codes) })}
              />
            </ConditionField>
            <ConditionField
              id={field('excludeItemCodes')}
              label="Except item codes"
              hint="None of these items."
              invalid={invalid('excludeItemCodes')}
            >
              <ItemPicker
                id={field('excludeItemCodes')}
                data={data}
                values={rule.excludeItemCodes ?? []}
                onChange={(codes) => patch({ excludeItemCodes: listOrUndefined(codes) })}
              />
            </ConditionField>
            <ConditionField
              id={field('itemTypes')}
              label="Item types"
              hint="itemtypes.txt codes; parent types match too (weap = every weapon)."
              invalid={invalid('itemTypes')}
            >
              <ItemTypePicker
                id={field('itemTypes')}
                data={data}
                values={rule.itemTypes ?? []}
                onChange={(codes) => patch({ itemTypes: listOrUndefined(codes) })}
              />
            </ConditionField>
            <ConditionField
              id={field('excludeItemTypes')}
              label="Except item types"
              hint="Not of these types (parent types included)."
              invalid={invalid('excludeItemTypes')}
            >
              <ItemTypePicker
                id={field('excludeItemTypes')}
                data={data}
                values={rule.excludeItemTypes ?? []}
                onChange={(codes) => patch({ excludeItemTypes: listOrUndefined(codes) })}
              />
            </ConditionField>
            <ConditionField
              id={field('uniqueOrSetIds')}
              label="Unique or set items"
              hint="Row ids; a unique and a set item can share one, so add a quality to tell them apart."
              invalid={invalid('uniqueOrSetIds')}
            >
              <UniqueOrSetPicker
                id={field('uniqueOrSetIds')}
                data={data}
                values={rule.uniqueOrSetIds ?? []}
                onChange={(ids) => patch({ uniqueOrSetIds: listOrUndefined(ids) })}
              />
            </ConditionField>
            <ConditionField
              id={field('excludeUniqueOrSetIds')}
              label="Except unique or set items"
              hint="Not one of these rows."
              invalid={invalid('excludeUniqueOrSetIds')}
            >
              <UniqueOrSetPicker
                id={field('excludeUniqueOrSetIds')}
                data={data}
                values={rule.excludeUniqueOrSetIds ?? []}
                onChange={(ids) => patch({ excludeUniqueOrSetIds: listOrUndefined(ids) })}
              />
            </ConditionField>
          </ConditionSection>

          <ConditionSection title="Item properties">
            <ConditionField id={field('quality')} label="Quality" hint="inferior … tempered (numbers 1 to 9)." invalid={invalid('quality')}>
              <NamedMatchControl
                id={field('quality')}
                label="Quality"
                scale={QUALITY_SCALE}
                value={rule.quality}
                onChange={(quality) => patch({ quality })}
              />
            </ConditionField>
            <ConditionField
              id={field('baseTier')}
              label="Base tier"
              hint="normal, exceptional, elite (0 to 2)."
              invalid={invalid('baseTier')}
            >
              <NamedMatchControl
                id={field('baseTier')}
                label="Base tier"
                scale={BASE_TIER_SCALE}
                value={rule.baseTier}
                onChange={(baseTier) => patch({ baseTier })}
              />
            </ConditionField>
            <ConditionField id={field('itemLevel')} label="Item level" hint="0 to 999." invalid={invalid('itemLevel')}>
              <NumberMatchControl
                id={field('itemLevel')}
                label="Item level"
                fallback={1}
                min={0}
                max={999}
                value={rule.itemLevel}
                onChange={(itemLevel) => patch({ itemLevel })}
              />
            </ConditionField>
            <ConditionField id={field('sockets')} label="Sockets" hint="Sockets the item has, 0 to 99." invalid={invalid('sockets')}>
              <NumberMatchControl
                id={field('sockets')}
                label="Sockets"
                fallback={1}
                min={0}
                max={99}
                value={rule.sockets}
                onChange={(sockets) => patch({ sockets })}
              />
            </ConditionField>
            <ConditionField
              id={field('maxSockets')}
              label="Max sockets"
              hint="The most sockets its base can have, 0 to 99."
              invalid={invalid('maxSockets')}
            >
              <NumberMatchControl
                id={field('maxSockets')}
                label="Max sockets"
                fallback={1}
                min={0}
                max={99}
                value={rule.maxSockets}
                onChange={(maxSockets) => patch({ maxSockets })}
              />
            </ConditionField>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
              {FLAGS.map((flag) => (
                <div key={flag.key} className="contents">
                  <span className="text-sm">{flag.label}</span>
                  <TriStateControl label={flag.label} value={rule[flag.key]} onChange={(value) => patch({ [flag.key]: value })} />
                </div>
              ))}
            </div>
          </ConditionSection>

          <ConditionSection title="Stats">
            <ConditionField
              id={field('itemStats')}
              label="Item stats"
              hint="All of these hold for the item."
              invalid={invalid('itemStats')}
            >
              <StatCheckList id={field('itemStats')} data={data} value={rule.itemStats} onChange={(itemStats) => patch({ itemStats })} />
            </ConditionField>
            <ConditionField
              id={field('itemStatsAnyOf')}
              label="Item stats, any of"
              hint="At least one of these holds for the item."
              invalid={invalid('itemStatsAnyOf')}
            >
              <StatCheckList
                id={field('itemStatsAnyOf')}
                data={data}
                value={rule.itemStatsAnyOf}
                onChange={(itemStatsAnyOf) => patch({ itemStatsAnyOf })}
              />
            </ConditionField>
            <ConditionField
              id={field('playerStats')}
              label="Player stats"
              hint="All of these hold for your character (e.g. level)."
              invalid={invalid('playerStats')}
            >
              <StatCheckList
                id={field('playerStats')}
                data={data}
                value={rule.playerStats}
                onChange={(playerStats) => patch({ playerStats })}
              />
            </ConditionField>
            <ConditionField
              id={field('playerStatsAnyOf')}
              label="Player stats, any of"
              hint="At least one of these holds for your character."
              invalid={invalid('playerStatsAnyOf')}
            >
              <StatCheckList
                id={field('playerStatsAnyOf')}
                data={data}
                value={rule.playerStatsAnyOf}
                onChange={(playerStatsAnyOf) => patch({ playerStatsAnyOf })}
              />
            </ConditionField>
          </ConditionSection>

          <ConditionSection title="Where and when">
            <ConditionField id={field('areas')} label="Areas" hint="You are in one of these areas." invalid={invalid('areas')}>
              <AreaPicker
                id={field('areas')}
                data={data}
                values={rule.areas ?? []}
                onChange={(ids) => patch({ areas: listOrUndefined(ids) })}
              />
            </ConditionField>
            <ConditionField
              id={field('excludeAreas')}
              label="Except areas"
              hint="You are in none of these areas."
              invalid={invalid('excludeAreas')}
            >
              <AreaPicker
                id={field('excludeAreas')}
                data={data}
                values={rule.excludeAreas ?? []}
                onChange={(ids) => patch({ excludeAreas: listOrUndefined(ids) })}
              />
            </ConditionField>
            <ConditionField
              id={field('location')}
              label="Location"
              hint="None ticked = on the ground only (the default)."
              invalid={invalid('location')}
            >
              <LocationControl id={field('location')} value={rule.location} onChange={(location) => patch({ location })} />
            </ConditionField>
            <ConditionField
              id={field('activeInLevels')}
              label="Filter levels"
              hint="The levels the rule is active at."
              invalid={invalid('activeInLevels')}
            >
              <LevelsControl
                id={field('activeInLevels')}
                levels={filter.filterLevels ?? []}
                value={rule.activeInLevels}
                onChange={(activeInLevels) => patch({ activeInLevels })}
              />
            </ConditionField>
            <ConditionField
              id={field('difficulty')}
              label="Difficulty"
              hint="normal, nightmare, hell (0 to 2)."
              invalid={invalid('difficulty')}
            >
              <NamedMatchControl
                id={field('difficulty')}
                label="Difficulty"
                scale={DIFFICULTY_SCALE}
                value={rule.difficulty}
                onChange={(difficulty) => patch({ difficulty })}
              />
            </ConditionField>
          </ConditionSection>

          {passthroughKeys.length > 0 && (
            <details className="rounded-md border px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium">Advanced / passthrough ({passthroughKeys.length})</summary>
              <p className="mt-1 text-xs text-muted-foreground">
                Unknown or wrong-shaped keys: not editable here, see the JSON tab. They are kept as they are.
              </p>
              <dl className="mt-2 space-y-1">
                {passthroughKeys.map((key) => (
                  <div key={key} className="flex min-w-0 gap-2">
                    <dt className="shrink-0 font-mono text-xs">{key}</dt>
                    <dd className="truncate font-mono text-xs text-muted-foreground">{JSON.stringify(rule.passthrough?.[key])}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionsEditor actions={pickActions(rule)} onChange={(value) => patch(value)} filter={filter} owner="rule" />
        </CardContent>
      </Card>
    </div>
  );
}
