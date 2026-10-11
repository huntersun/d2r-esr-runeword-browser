import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface NumberInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  readonly value: number | undefined;
  /** A finite number, or undefined when the field is emptied. Text that is not a number is not committed. */
  readonly onCommit: (value: number | undefined) => void;
  /** Accept whole numbers only. */
  readonly integer?: boolean;
}

function parse(text: string, integer: boolean): number | undefined | null {
  if (text.trim() === '') return undefined;
  const value = Number(text);
  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) return null;
  return value;
}

/** A number field that keeps what the user types (an empty or half-typed value) and commits only valid numbers. */
export function NumberInput({ value, onCommit, integer = false, ...props }: NumberInputProps) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [lastValue, setLastValue] = useState(value);

  // The model changed from elsewhere (JSON tab, another field): show it unless the text already means it.
  if (value !== lastValue) {
    setLastValue(value);
    if (parse(text, integer) !== value) setText(value === undefined ? '' : String(value));
  }

  return (
    <Input
      {...props}
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = parse(event.target.value, integer);
        if (parsed !== null && parsed !== value) {
          setLastValue(parsed);
          onCommit(parsed);
        }
      }}
    />
  );
}
