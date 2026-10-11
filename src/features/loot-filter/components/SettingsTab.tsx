import { useDispatch } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LootFilter } from '../engine/types';
import { setHeader, setNotifications, type LootFilterHeader } from '../store/lootFilterSlice';
import type { ShallowPatch } from '../utils/patch';
import { NumberInput } from './NumberInput';
import { FilterLevelsEditor } from './settings/FilterLevelsEditor';
import { FilterTextField } from './settings/FilterTextField';
import { QualityColorsEditor } from './settings/QualityColorsEditor';

type HeaderPatch = ShallowPatch<LootFilterHeader>;

interface TextField {
  readonly key: 'title' | 'author' | 'version' | 'updateUrl';
  readonly label: string;
  readonly placeholder: string;
  readonly toPatch: (value: string | undefined) => HeaderPatch;
}

const TEXT_FIELDS: readonly TextField[] = [
  { key: 'title', label: 'Title', placeholder: 'My Filter', toPatch: (title) => ({ title }) },
  { key: 'author', label: 'Author', placeholder: 'Me', toPatch: (author) => ({ author }) },
  { key: 'version', label: 'Version', placeholder: '1.0', toPatch: (version) => ({ version }) },
  {
    key: 'updateUrl',
    label: 'Update URL',
    placeholder: 'https://… where newer copies are published',
    toPatch: (updateUrl) => ({ updateUrl }),
  },
];

interface SettingsTabProps {
  readonly filter: LootFilter;
}

/** The filter's top-level settings. Every change goes straight to the store (no local form state). */
export function SettingsTab({ filter }: SettingsTabProps) {
  const dispatch = useDispatch();
  const patch = (value: HeaderPatch) => dispatch(setHeader(value));
  const emptyToUndefined = (value: string) => (value === '' ? undefined : value);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>About the filter</CardTitle>
          <CardDescription>Shown in the launcher&apos;s filter list.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`loot-filter-${field.key}`}>{field.label}</Label>
              <Input
                id={`loot-filter-${field.key}`}
                value={filter[field.key] ?? ''}
                placeholder={field.placeholder}
                onChange={(event) => patch(field.toPatch(emptyToUndefined(event.target.value)))}
              />
            </div>
          ))}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="loot-filter-description">Description</Label>
            <Textarea
              id="loot-filter-description"
              value={filter.description ?? ''}
              onChange={(event) => patch({ description: emptyToUndefined(event.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Behaviour</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id="loot-filter-hide-unmatched"
              checked={filter.hideUnmatchedItems === true}
              onCheckedChange={(checked) => patch({ hideUnmatchedItems: checked === true })}
            />
            <div className="grid gap-1">
              <Label htmlFor="loot-filter-hide-unmatched">Hide unmatched items</Label>
              <p className="text-xs text-muted-foreground">Hides every ground item no rule applied to.</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loot-filter-sound-volume">Sound volume</Label>
            <NumberInput
              id="loot-filter-sound-volume"
              className="w-28"
              min={0}
              max={100}
              value={filter.soundVolume}
              placeholder="100"
              onCommit={(soundVolume) => patch({ soundVolume })}
            />
            <p className="text-xs text-muted-foreground">0 to 100, for rules that set no volume of their own.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filter levels</CardTitle>
          <CardDescription>The level key in game steps through these; rules can be limited to some of them.</CardDescription>
        </CardHeader>
        <CardContent>
          <FilterLevelsEditor filter={filter} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FilterTextField
            id="loot-filter-drop-format"
            label="Drop line"
            hint="Printed by rules with notify. Placeholders such as {name} and {qualityColor} are filled in."
            placeholder="{qualityColor}{name}"
            value={filter.notifications?.dropFormat}
            onChange={(dropFormat) => dispatch(setNotifications({ dropFormat }))}
          />
          <FilterTextField
            id="loot-filter-level-change-format"
            label="Level change line"
            hint="Printed when the level changes; takes {level} and {filter}."
            placeholder="ÿc4Loot filter level: ÿc0{level}"
            value={filter.notifications?.levelChangeFormat}
            onChange={(levelChangeFormat) => dispatch(setNotifications({ levelChangeFormat }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quality colours</CardTitle>
          <CardDescription>The colour code {'{qualityColor}'} uses for each item quality.</CardDescription>
        </CardHeader>
        <CardContent>
          <QualityColorsEditor value={filter.qualityColors} />
        </CardContent>
      </Card>
    </div>
  );
}
