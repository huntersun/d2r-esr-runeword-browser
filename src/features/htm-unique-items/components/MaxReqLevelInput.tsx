import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { useDebouncedFilterValue } from '@/core/hooks/useDebouncedFilterValue';
import { MAX_REQ_LEVEL_RANGE } from '@/core/utils/filterUrlParams';

const INPUT_DEBOUNCE_MS = 300;

interface MaxReqLevelInputProps {
  /** Input id, also used for the sr-only label */
  readonly id: string;
  readonly value: number | null;
  /** Called (debounced) with the new cap, or null when cleared */
  readonly onChange: (value: number | null) => void;
}

/** "Max Req Lvl" number input shared by the Unique Items and Mythical Uniques filter bars (`maxlvl` URL param). */
export function MaxReqLevelInput({ id, value, onChange }: MaxReqLevelInputProps) {
  const [localValue, setLocalValue, commitValue] = useDebouncedFilterValue(value, onChange, INPUT_DEBOUNCE_MS);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setLocalValue(null);
      return;
    }
    const num = parseInt(raw, 10);
    if (num >= MAX_REQ_LEVEL_RANGE.min && num <= MAX_REQ_LEVEL_RANGE.max) {
      setLocalValue(num);
    }
  };

  return (
    <div className="w-32 space-y-1">
      <p className="text-xs text-muted-foreground">Max required level.</p>
      <Label htmlFor={id} className="sr-only">
        Max Req Level
      </Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          type="number"
          min={MAX_REQ_LEVEL_RANGE.min}
          max={MAX_REQ_LEVEL_RANGE.max}
          placeholder="Max Req Lvl"
          value={localValue ?? ''}
          onChange={handleChange}
          autoComplete="off"
          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {localValue !== null && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                commitValue(null);
              }}
              aria-label="Clear max req level"
            >
              <X className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}
