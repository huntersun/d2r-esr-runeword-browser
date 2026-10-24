import { X } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { SearchHelpButton } from '@/components/SearchHelpButton';
import { cn } from '@/lib/utils';

export interface PillOption {
  readonly value: string;
  readonly label: string;
  /** Shown after the label, e.g. the outcome count */
  readonly count?: number;
}

interface PillsProps {
  readonly options: readonly PillOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly label: string;
}

/** A row of pill buttons (one selected), wrapping on narrow screens */
export function Pills({ options, value, onChange, label }: PillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              onChange(option.value);
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              active ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn('ml-1.5 text-xs', active ? 'opacity-80' : 'opacity-70')}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface EnhanceSearchProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onClear: () => void;
  readonly placeholder: string;
}

export function EnhanceSearch({ value, onChange, onClear, placeholder }: EnhanceSearchProps) {
  return (
    <div className="w-full max-w-md space-y-1">
      <div className="flex items-center gap-1">
        <p className="text-xs text-muted-foreground">
          Search the bonus text; <code className="rounded bg-muted px-1">"exact phrases"</code>
        </p>
        <SearchHelpButton />
      </div>
      <Label htmlFor="enhance-search" className="sr-only">
        Search
      </Label>
      <InputGroup>
        <InputGroupInput
          id="enhance-search"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {value && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="ghost" size="icon-xs" onClick={onClear} aria-label="Clear search">
              <X className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}

/** Rendered stat lines in the item-text colour */
export function BonusLines({ lines, className }: { readonly lines: readonly string[]; readonly className?: string }) {
  return (
    <ul className={cn('space-y-0.5 text-blue-700 dark:text-blue-400', className)}>
      {lines.map((line, index) => (
        // Lines can repeat; the index keeps keys unique
        <li key={`${String(index)}-${line}`}>{line}</li>
      ))}
    </ul>
  );
}

/** "computed from the recipe rows" rate with a dotted underline */
export function ComputedRate({ children }: { readonly children: React.ReactNode }) {
  return (
    <span title="Computed from the recipe rows" className="cursor-help underline decoration-dotted underline-offset-2">
      {children}
    </span>
  );
}

export function NoMatches() {
  return <p className="py-6 text-center text-sm text-muted-foreground">Nothing matches the search.</p>;
}
