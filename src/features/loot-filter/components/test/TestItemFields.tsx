import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BASE_TIERS, LOCATIONS, QUALITIES, type ItemLocation } from '../../engine/types';
import type { LootFilterData } from '../../hooks/useLootFilterData';
import {
  itemTypeOf,
  parseUniqueOrSetValue,
  uniqueOrSetValue,
  withItem,
  withQuality,
  withUniqueOrSet,
  type TestItemForm,
} from '../../utils/testItemForm';
import { NumberInput } from '../NumberInput';
import { SingleItemPicker, SinglePicker } from '../pickers';
import { idCustom } from '../pickers/customOptions';
import { StatRowsEditor } from './StatRowsEditor';
import { TestField } from './TestField';

const LOCATION_LABELS: Readonly<Record<ItemLocation, string>> = {
  onGround: 'On the ground',
  stored: 'Stored (inventory, stash, cube)',
  equipped: 'Equipped',
  atVendor: 'At a vendor',
};

const FLAGS = [
  { key: 'isIdentified', label: 'Identified' },
  { key: 'isEthereal', label: 'Ethereal' },
  { key: 'isRuneword', label: 'Runeword' },
  { key: 'isFullySocketed', label: 'Fully socketed' },
] as const;

const ID = 'loot-filter-test';

interface TestItemFieldsProps {
  readonly data: LootFilterData;
  readonly form: TestItemForm;
  readonly onChange: (form: TestItemForm) => void;
}

/** The item half of the test form: base item, quality and properties, unique/set row, stats and location. */
export function TestItemFields({ data, form, onChange }: TestItemFieldsProps) {
  const { lookup } = data;
  const update = (patch: Partial<TestItemForm>) => {
    onChange({ ...form, ...patch });
  };
  const type = itemTypeOf(form, lookup);
  const typeInfo = type === '' ? undefined : lookup.itemType(type);
  const uniqueName = form.uniqueOrSet === null ? undefined : lookup.uniqueOrSetName(form.uniqueOrSet.id);

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TestField id={`${ID}-item`} label="Item">
          <SingleItemPicker
            data={data}
            id={`${ID}-item`}
            value={form.code === '' ? undefined : form.code}
            onChange={(code) => {
              onChange(withItem(form, code, lookup));
            }}
            className="w-full"
          />
        </TestField>
        <TestField id={`${ID}-name`} label="Name ({name})">
          <Input
            id={`${ID}-name`}
            className="h-8"
            value={form.name}
            placeholder="The game's name"
            onChange={(event) => {
              update({ name: event.target.value });
            }}
          />
        </TestField>
      </div>

      <TestField id={`${ID}-type`} label="Item type">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={`${ID}-type`}
            className="h-8 w-28 font-mono"
            value={form.type}
            placeholder={type === '' ? 'type code' : type}
            onChange={(event) => {
              update({ type: event.target.value });
            }}
          />
          <span className="min-w-0 text-xs text-muted-foreground">
            {typeInfo === undefined
              ? type === ''
                ? 'Unknown: item-type conditions do not match.'
                : 'Only this type is known (no parent types).'
              : `${typeInfo.name === '' ? type : typeInfo.name} · matches ${typeInfo.ancestors.join(', ')}`}
          </span>
        </div>
      </TestField>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TestField id={`${ID}-quality`} label="Quality">
          <Select
            value={String(form.quality)}
            onValueChange={(value) => {
              onChange(withQuality(form, Number(value)));
            }}
          >
            <SelectTrigger id={`${ID}-quality`} size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITIES.map((quality, index) => (
                <SelectItem key={quality} value={String(index + 1)}>
                  {quality}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TestField>
        <TestField id={`${ID}-tier`} label="Base tier">
          <Select
            value={String(form.baseTier)}
            onValueChange={(value) => {
              update({ baseTier: Number(value) });
            }}
          >
            <SelectTrigger id={`${ID}-tier`} size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BASE_TIERS.map((tier, index) => (
                <SelectItem key={tier} value={String(index)}>
                  {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TestField>
        <TestField id={`${ID}-location`} label="Location" className="col-span-2 sm:col-span-1">
          <Select
            value={form.location}
            onValueChange={(value) => {
              const location = LOCATIONS.find((candidate) => candidate === value);
              if (location !== undefined) update({ location });
            }}
          >
            <SelectTrigger id={`${ID}-location`} size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((location) => (
                <SelectItem key={location} value={location}>
                  {LOCATION_LABELS[location]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TestField>
        <TestField id={`${ID}-ilvl`} label="Item level">
          <NumberInput
            id={`${ID}-ilvl`}
            integer
            min={0}
            max={999}
            className="h-8"
            value={form.itemLevel}
            onCommit={(itemLevel) => {
              update({ itemLevel });
            }}
          />
        </TestField>
        <TestField id={`${ID}-sockets`} label="Sockets">
          <NumberInput
            id={`${ID}-sockets`}
            integer
            min={0}
            max={99}
            className="h-8"
            value={form.sockets}
            onCommit={(sockets) => {
              update({ sockets });
            }}
          />
        </TestField>
        <TestField id={`${ID}-max-sockets`} label="Max sockets">
          <NumberInput
            id={`${ID}-max-sockets`}
            integer
            min={0}
            max={99}
            className="h-8"
            value={form.maxSockets}
            onCommit={(maxSockets) => {
              update({ maxSockets });
            }}
          />
        </TestField>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {FLAGS.map((flag) => (
          <div key={flag.key} className="flex items-center gap-1.5">
            <Checkbox
              id={`${ID}-${flag.key}`}
              checked={form[flag.key]}
              onCheckedChange={(checked) => {
                onChange({ ...form, [flag.key]: checked === true });
              }}
            />
            <Label htmlFor={`${ID}-${flag.key}`} className="text-sm font-normal">
              {flag.label}
            </Label>
          </div>
        ))}
      </div>

      <TestField id={`${ID}-unique`} label="Unique or set item">
        <div className="flex gap-1">
          <SinglePicker
            id={`${ID}-unique`}
            // Option keys (`Unique:12`, `Set:12`) as values: the two tables share ids, the key tells them apart.
            options={data.options.uniquesAndSets.map((option) => ({ ...option, value: option.key }))}
            value={uniqueOrSetValue(form.uniqueOrSet)}
            onChange={(value) => {
              onChange(withUniqueOrSet(form, parseUniqueOrSetValue(value), data.data, lookup));
            }}
            describe={() => {
              const id = form.uniqueOrSet === null ? '' : String(form.uniqueOrSet.id);
              return { label: uniqueName ?? `#${id}`, detail: id, muted: data.status === 'ready' && uniqueName === undefined };
            }}
            placeholder="None"
            searchPlaceholder="Name, base item or id…"
            custom={idCustom('row')}
            className="min-w-0 flex-1"
          />
          {form.uniqueOrSet !== null && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-8"
              aria-label="No unique or set item"
              onClick={() => {
                onChange(withUniqueOrSet(form, null, data.data, lookup));
              }}
            >
              <X />
            </Button>
          )}
        </div>
      </TestField>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium">Item stats</span>
        <StatRowsEditor
          data={data}
          idPrefix={`${ID}-item-stat`}
          rows={form.stats}
          onChange={(stats) => {
            update({ stats });
          }}
          addLabel="Add item stat"
        />
      </div>
    </div>
  );
}
