import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isClassCode, type ClassInfo } from '../engine/schema';
import { CHARACTER_LEVEL_RANGE, CHARACTER_STAT_RANGE } from '../store/character';
import { selectBestBaseOptions, selectCharacter, setEthereal, setIncludeUnusable, updateCharacter } from '../store/gameDataSlice';

interface StatInputProps {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly range: { readonly min: number; readonly max: number };
  readonly onCommit: (value: number) => void;
}

/** Number input that commits every valid value and shows the stored value again on blur. */
export function StatInput({ id, label, value, range, onCommit }: StatInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="w-20 space-y-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={range.min}
        max={range.max}
        value={draft ?? String(value)}
        onChange={(e) => {
          setDraft(e.target.value);
          const parsed = Number(e.target.value);
          if (e.target.value !== '' && Number.isInteger(parsed) && parsed >= range.min && parsed <= range.max) onCommit(parsed);
        }}
        onBlur={() => {
          setDraft(null);
        }}
        autoComplete="off"
        className="h-8"
      />
    </div>
  );
}

interface CharacterFormProps {
  readonly classes: readonly ClassInfo[];
}

/** Class, level, Str, Dex (persisted) plus the page toggles. */
export function CharacterForm({ classes }: CharacterFormProps) {
  const dispatch = useDispatch();
  const character = useSelector(selectCharacter);
  const options = useSelector(selectBestBaseOptions);

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="space-y-1">
        <Label htmlFor="best-base-class" className="text-xs font-normal text-muted-foreground">
          Class
        </Label>
        <Select
          value={character.cls}
          onValueChange={(value) => {
            if (value === 'any' || isClassCode(value)) dispatch(updateCharacter({ cls: value }));
          }}
        >
          <SelectTrigger id="best-base-class" size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any class</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.code} value={cls.code}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <StatInput
        id="best-base-level"
        label="Level"
        value={character.level}
        range={CHARACTER_LEVEL_RANGE}
        onCommit={(level) => dispatch(updateCharacter({ level }))}
      />
      <StatInput
        id="best-base-str"
        label="Strength"
        value={character.str}
        range={CHARACTER_STAT_RANGE}
        onCommit={(str) => dispatch(updateCharacter({ str }))}
      />
      <StatInput
        id="best-base-dex"
        label="Dexterity"
        value={character.dex}
        range={CHARACTER_STAT_RANGE}
        onCommit={(dex) => dispatch(updateCharacter({ dex }))}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-1">
        <label className="flex cursor-pointer items-center gap-1.5">
          <Checkbox checked={options.includeUnusable} onCheckedChange={(checked) => dispatch(setIncludeUnusable(checked === true))} />
          <span className="text-sm">Include bases I can't use yet</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5" title="Vanilla rules: −10 Str/Dex requirement, ×1.5 damage/defense">
          <Checkbox checked={options.ethereal} onCheckedChange={(checked) => dispatch(setEthereal(checked === true))} />
          <span className="text-sm">Ethereal (estimate)</span>
        </label>
      </div>
    </div>
  );
}
