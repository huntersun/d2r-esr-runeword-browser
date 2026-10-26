import { useEffect, useRef, useState } from 'react';
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
import { DIAGNOSTICS_LIST_ID, DiagnosticsList } from './DiagnosticsList';

interface JsonTabProps {
  /** The open model; null when the entry's text is not valid JSON (then the draft starts from `entryText`). */
  readonly filter: LootFilter | null;
  readonly entryText: string;
  readonly diagnostics: readonly Diagnostic[];
  readonly onShowRule: (index: number) => void;
  /** The unapplied text, held by the editor screen so it survives tab switches; null while the text follows the model. */
  readonly draft: JsonDraft | null;
  readonly onDraftChange: (draft: JsonDraft | null) => void;
  /** Non-zero: scroll to the problems list (once this tab has rendered), then `onScrolledToProblems` resets it. */
  readonly scrollToProblems: number;
  readonly onScrolledToProblems: () => void;
}

export interface JsonDraft {
  /** The model text the draft was taken from. */
  readonly base: string;
  readonly text: string;
}

interface SyntaxProblem {
  readonly message: string;
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
 * The filter file as text. The text follows the model (form edits in the other tabs) until the user types in it; then
 * the draft stays, also across tab switches, until Apply (parse and replace the model) or Revert.
 */
export function JsonTab({
  filter,
  entryText,
  diagnostics,
  onShowRule,
  draft,
  onDraftChange,
  scrollToProblems,
  onScrolledToProblems,
}: JsonTabProps) {
  const dispatch = useDispatch();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const modelText = filter === null ? entryText : serializeLootFilter(filter);
  const [problem, setProblem] = useState<SyntaxProblem | null>(null);

  const base = draft?.base ?? modelText;
  const text = draft?.text ?? modelText;
  const edited = text !== base;
  // The model changed (an edit in another editor tab) after the user started typing here.
  const stale = edited && base !== modelText;

  useEffect(() => {
    if (scrollToProblems === 0) return;
    document.getElementById(DIAGNOSTICS_LIST_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onScrolledToProblems();
  }, [scrollToProblems, onScrolledToProblems]);

  const handleApply = () => {
    try {
      const { filter: parsed, diagnostics: parseDiagnostics, notes } = parseLootFilter(text);
      dispatch(replaceFilter({ filter: parsed, diagnostics: parseDiagnostics, notes }));
      // The text follows the model again: the re-serialized draft (strict JSON, comments after the brace gone).
      onDraftChange(null);
      setProblem(null);
      toast.success('Applied', { description: notes.length === 0 ? undefined : notes.map((note) => `${note.message}.`).join(' ') });
    } catch (error) {
      if (error instanceof JsoncSyntaxError) {
        const { line, column } = error;
        setProblem({ message: error.message });
        const element = textarea.current;
        if (element && line !== undefined && column !== undefined) {
          const offset = offsetOf(text, line, column);
          element.focus();
          element.setSelectionRange(offset, Math.min(offset + 1, text.length));
        }
      } else {
        setProblem({ message: error instanceof Error ? error.message : String(error) });
      }
    }
  };

  const handleRevert = () => {
    onDraftChange(null);
    setProblem(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(
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
            The filter was changed in another editor tab since you started typing here. Apply replaces those changes with this text; Revert
            drops this text and loads them.
          </p>
        )}
        <Textarea
          ref={textarea}
          value={text}
          onChange={(event) => {
            const next = event.target.value;
            // Typed back to where it started: the text follows the model again (as before the first keystroke).
            onDraftChange(next === base ? null : { base, text: next });
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
          Apply reads the text like an upload. Only the <code>{'//'}</code> comment lines at the top of the file are kept; comments between
          rules are not shown here and are dropped by Apply and by any edit in the other tabs.
        </p>
      </div>

      <DiagnosticsList diagnostics={diagnostics} onShowRule={onShowRule} />
    </div>
  );
}
