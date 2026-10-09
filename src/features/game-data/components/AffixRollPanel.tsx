import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { BaseItem } from '../engine/schema';
import { AFFIX_LEVEL_RANGE } from '../constants/affixes';
import { selectAffixFilters, setAffixBase, setAffixIlvl, setAffixIncludeAutomagic, setAffixQuality } from '../store/gameDataSlice';
import { ComboPicker, type ComboOption } from './ComboPicker';
import { StatInput } from './CharacterForm';

interface AffixRollPanelProps {
  readonly baseOptions: readonly ComboOption[];
  /** Selected base (undefined in browse mode) */
  readonly base: BaseItem | undefined;
  /** Affix level of the selected base at the current item level */
  readonly alvl: number | null;
}

/** Base picker; with a base selected also item level, quality, automods and the resulting affix level. */
export function AffixRollPanel({ baseOptions, base, alvl }: AffixRollPanelProps) {
  const dispatch = useDispatch();
  const { ilvl, quality, includeAutomagic } = useSelector(selectAffixFilters);

  return (
    <div className="mb-6 space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-64 max-w-xl flex-1 space-y-1">
          <Label htmlFor="affixes-base" className="text-xs font-normal text-muted-foreground">
            What can roll on a base?
          </Label>
          <ComboPicker
            id="affixes-base"
            className="w-full"
            options={baseOptions}
            selectedId={base?.code ?? null}
            placeholder="Pick a base…"
            searchPlaceholder="Search name, type or code…"
            onSelect={(code) => dispatch(setAffixBase(code))}
          />
        </div>
        {base !== undefined && (
          <Button variant="outline" size="sm" onClick={() => dispatch(setAffixBase(null))}>
            <X className="size-4" />
            Clear base
          </Button>
        )}
      </div>

      {base !== undefined && (
        <>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <StatInput
              id="affixes-ilvl"
              label="Item level"
              value={ilvl}
              range={AFFIX_LEVEL_RANGE}
              onCommit={(value) => dispatch(setAffixIlvl(value))}
            />
            <Slider
              className="mb-3 w-56"
              min={AFFIX_LEVEL_RANGE.min}
              max={AFFIX_LEVEL_RANGE.max}
              step={1}
              value={[ilvl]}
              onValueChange={(values) => {
                const value = values.at(0);
                if (value !== undefined) dispatch(setAffixIlvl(value));
              }}
              thumbProps={{ 'aria-label': 'Item level' }}
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Quality</p>
              <div className="flex gap-1">
                {(['magic', 'rare'] as const).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={quality === value ? 'default' : 'outline'}
                    aria-pressed={quality === value}
                    onClick={() => dispatch(setAffixQuality(value))}
                  >
                    {value === 'magic' ? 'Magic' : 'Rare'}
                  </Button>
                ))}
              </div>
            </div>
            <label className="flex h-8 cursor-pointer items-center gap-1">
              <Checkbox checked={includeAutomagic} onCheckedChange={(checked) => dispatch(setAffixIncludeAutomagic(checked === true))} />
              <span className="text-sm">Include automods</span>
            </label>
          </div>
          {alvl !== null && (
            <p className="text-sm">
              Affix level <span className="font-semibold">{alvl}</span> at ilvl {ilvl} on {base.name} (qlvl {base.qlvl}
              {base.magicLvl > 0 && `, magic lvl +${String(base.magicLvl)}`})
            </p>
          )}
        </>
      )}
    </div>
  );
}
