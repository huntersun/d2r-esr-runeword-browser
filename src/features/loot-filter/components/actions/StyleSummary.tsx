import { ChevronRight } from 'lucide-react';
import type { RuleActions } from '../../engine/types';
import { EFFECT_KEYS } from '../../engine/parse';

interface StyleSummaryProps {
  readonly name: string;
  readonly style: RuleActions;
}

/** A collapsed, read-only list of a style's actions (key and JSON value); its comment is not an action. */
export function StyleSummary({ name, style }: StyleSummaryProps) {
  const entries = EFFECT_KEYS.filter((key) => style[key] !== undefined).map((key) => [key, JSON.stringify(style[key])] as const);
  return (
    <details className="group rounded-md border px-3 py-2 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1 font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
        Style “{name}”: {entries.length === 1 ? '1 action' : `${String(entries.length)} actions`}
      </summary>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">This style sets no actions.</p>
      ) : (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="break-all font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {style.comment !== undefined && <p className="mt-2 text-xs text-muted-foreground">Comment: {style.comment}</p>}
      <p className="mt-2 text-xs text-muted-foreground">Edit it in the Styles tab; the rule&apos;s own actions win.</p>
    </details>
  );
}
