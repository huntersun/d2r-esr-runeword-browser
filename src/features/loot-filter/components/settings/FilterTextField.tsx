import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveText } from '../../engine/text';
import type { FilterText } from '../../engine/types';

interface FilterTextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly placeholder: string;
  readonly value: FilterText | undefined;
  /** The new plain string, or undefined when emptied. */
  readonly onChange: (value: string | undefined) => void;
}

/** A plain-string text setting; a per-language object is shown read-only (it is edited in the JSON tab). */
export function FilterTextField({ id, label, hint, placeholder, value, onChange }: FilterTextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {typeof value === 'object' ? (
        <div id={id} className="rounded-md border border-dashed px-3 py-2 text-sm">
          <p className="text-muted-foreground">Multi-language text, edit in the JSON tab.</p>
          {resolveText(value) !== undefined && <p className="mt-1 break-all font-mono text-xs">enUS: {resolveText(value)}</p>}
        </div>
      ) : (
        <Input
          id={id}
          value={value ?? ''}
          placeholder={placeholder}
          className="font-mono"
          onChange={(event) => {
            onChange(event.target.value === '' ? undefined : event.target.value);
          }}
        />
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
