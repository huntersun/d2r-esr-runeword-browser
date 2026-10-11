import { CircleAlert, TriangleAlert } from 'lucide-react';
import type { Diagnostic } from '../../engine/types';

interface RuleDiagnosticsProps {
  readonly index: number;
  /** This rule's diagnostics only. */
  readonly diagnostics: readonly Diagnostic[];
}

/** The rule's problems as a compact list (errors first); the path is shown relative to the rule. */
export function RuleDiagnostics({ index, diagnostics }: RuleDiagnosticsProps) {
  if (diagnostics.length === 0) return null;
  const prefix = `rules/${String(index)}`;
  const sorted = [...diagnostics].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  return (
    <ul className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-sm" aria-label="Problems with this rule">
      {sorted.map((diagnostic, position) => {
        const path = diagnostic.path === prefix ? '' : diagnostic.path.replace(`${prefix}/`, '');
        return (
          <li key={`${diagnostic.path}-${String(position)}`} className="flex items-start gap-2">
            {diagnostic.severity === 'error' ? (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Error" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Warning" />
            )}
            <span className="min-w-0 break-words">
              {diagnostic.message}
              {path !== '' && <code className="ml-2 text-xs break-all text-muted-foreground">{path}</code>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
