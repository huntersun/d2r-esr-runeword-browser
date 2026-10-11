import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { Check, ClipboardCopy, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { JsoncSyntaxError } from '../engine/jsonc';
import { parseLootFilter } from '../engine/parse';
import { serializeLootFilter } from '../engine/serialize';
import type { Diagnostic, LootFilter } from '../engine/types';
import { replaceFilter } from '../store/lootFilterSlice';
import { DiagnosticsList } from './DiagnosticsList';

interface JsonTabProps {
  /** The open model; null when the entry's text is not valid JSON (then the draft starts from `entryText`). */
  readonly filter: LootFilter | null;
  readonly entryText: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly onShowRule: (index: number) => void;
}

interface Draft {
  /** The model text the draft was taken from. */
  readonly base: string;
  readonly text: string;
}

interface SyntaxProblem {
  readonly message: string;
  readonly line: number | null;
  readonly column: number | null;
}

/** 0-based offset of a 1-based line and column. */
function offsetOf(text: string, line: number, column: number): number {
  let offset = 0;
  for (let current = 1; current < line; current++) {
    const next = text.indexOf('\n', offset);
    if (next === -1) return text.length;
    offset = next + 1;
  }
  return Math.min(offset + column - 1, text.length);
}

/**
 * The filter file as text. The draft follows the model (form edits elsewhere) until the user types in it; then it
 * stays until Apply (parse and replace the model) or Revert. Comments between rules are not kept by Apply.
 */
export function JsonTab({ filter, entryText, diagnostics, onShowRule }: JsonTabProps) {
  const dispatch = useDispatch();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const modelText = filter === null ? entryText : serializeLootFilter(filter);
  const [draft, setDraft] = useState<Draft>({ base: modelText, text: modelText });
  const [problem, setProblem] = useState<SyntaxProblem | null>(null);

  const edited = draft.text !== draft.base;
  if (draft.base !== modelText && !edited) setDraft({ base: modelText, text: modelText });
  const stale = edited && draft.base !== modelText;

  const handleApply = () => {
    try {
      const { filter: parsed, diagnostics: parseDiagnostics } = parseLootFilter(draft.text);
      dispatch(replaceFilter({ filter: parsed, diagnostics: parseDiagnostics }));
      // The model text after Apply is the re-serialized draft; this makes the draft follow it.
      setDraft({ base: draft.text, text: draft.text });
      setProblem(null);
      toast.success('Applied');
    } catch (error) {
      if (error instanceof JsoncSyntaxError) {
        setProblem({ message: error.message, line: error.line, column: error.column });
        const element = textarea.current;
        if (element) {
          const offset = offsetOf(draft.text, error.line, error.column);
          element.focus();
          element.setSelectionRange(offset, Math.min(offset + 1, draft.text.length));
        }
      } else {
        setProblem({ message: error instanceof Error ? error.message : String(error), line: null, column: null });
      }
    }
  };

  const handleRevert = () => {
    setDraft({ base: modelText, text: modelText });
    setProblem(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft.text).then(
      () => toast.success('Copied to the clipboard'),
      () => toast.error('Could not copy to the clipboard')
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleApply} disabled={!edited && filter !== null}>
            <Check />
            Apply
          </Button>
          <Button size="sm" variant="outline" onClick={handleRevert} disabled={!edited}>
            <Undo2 />
            Revert
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <ClipboardCopy />
            Copy
          </Button>
          {edited && <span className="text-xs text-muted-foreground">Unapplied changes</span>}
        </div>
        {stale && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            The filter changed in another tab since you started editing here. Apply replaces those changes; Revert loads them.
          </p>
        )}
        <Textarea
          ref={textarea}
          value={draft.text}
          onChange={(event) => {
            setDraft({ base: draft.base, text: event.target.value });
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Filter file (JSON)"
          aria-invalid={problem !== null}
          className="h-[60vh] min-h-64 resize-y font-mono text-xs leading-relaxed [field-sizing:fixed] md:text-xs"
        />
        {problem !== null && (
          <p role="alert" className="text-sm text-destructive">
            {problem.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Apply reads the text like an upload: <code>{'//'}</code> comment lines at the top are kept, comments between rules are not.
        </p>
      </div>

      <DiagnosticsList diagnostics={diagnostics} onShowRule={onShowRule} />
    </div>
  );
}
