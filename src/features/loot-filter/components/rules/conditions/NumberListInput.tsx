import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatNumberList, parseNumberList } from '../../../utils/matchValues';

interface NumberListInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  readonly value: readonly number[];
  /** Called with whole numbers only; text that does not parse (or is empty) is not committed. */
  readonly onCommit: (value: readonly number[]) => void;
}

/** `1, 2, 3`: keeps what the user types and commits the list whenever the text parses. */
export function NumberListInput({ value, onCommit, ...props }: NumberListInputProps) {
  const [text, setText] = useState(() => formatNumberList(value));
  const [lastValue, setLastValue] = useState(value);

  // The model changed from elsewhere: show it unless the text already means it.
  if (value !== lastValue) {
    setLastValue(value);
    if (formatNumberList(parseNumberList(text) ?? []) !== formatNumberList(value)) setText(formatNumberList(value));
  }

  const invalid = parseNumberList(text) === null;

  return (
    <Input
      {...props}
      inputMode="numeric"
      value={text}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = parseNumberList(event.target.value);
        if (parsed !== null && formatNumberList(parsed) !== formatNumberList(value)) {
          setLastValue(parsed);
          onCommit(parsed);
        }
      }}
    />
  );
}
