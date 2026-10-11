import { useState } from 'react';
import { NumberInput } from '../../NumberInput';

interface RequiredNumberInputProps extends Omit<React.ComponentProps<typeof NumberInput>, 'onCommit'> {
  /** Called with valid numbers only; the field cannot be emptied. */
  readonly onCommit: (value: number) => void;
}

/** True when the text commits nothing (empty, not a number, or a fraction where a whole number is needed). */
function commitsNothing(text: string, integer: boolean): boolean {
  const value = Number(text);
  return text.trim() === '' || !Number.isFinite(value) || (integer && !Number.isInteger(value));
}

/**
 * A `NumberInput` for a value that must stay set (an "exactly" match, a stat check's value): leaving the field
 * empty or invalid shows the model's number again instead of a blank field the model does not reflect.
 */
export function RequiredNumberInput({ onCommit, onBlur, integer = false, ...props }: RequiredNumberInputProps) {
  // A new key remounts the input, which then shows `value` again.
  const [resetKey, setResetKey] = useState(0);
  return (
    <NumberInput
      key={resetKey}
      {...props}
      integer={integer}
      onCommit={(next) => {
        if (next !== undefined) onCommit(next);
      }}
      onBlur={(event) => {
        if (commitsNothing(event.currentTarget.value, integer)) setResetKey(resetKey + 1);
        onBlur?.(event);
      }}
    />
  );
}
