import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { RootState } from '@/core/store';
import { serializeLootFilter } from '../engine/serialize';
import { DiagnosticsChip } from '../components/DiagnosticsChip';
import { DIAGNOSTICS_LIST_ID } from '../components/DiagnosticsList';
import { InlineName } from '../components/InlineName';
import { JsonTab } from '../components/JsonTab';
import { RulesTab } from '../components/RulesTab';
import { SettingsTab } from '../components/SettingsTab';
import { StylesTab } from '../components/StylesTab';
import { TestTab } from '../components/TestTab';
import { EDITOR_TABS, useEditorTab, type EditorTab } from '../hooks/useEditorTab';
import { useLootFilterReference } from '../hooks/useLootFilterReference';
import { close, editorFlushed, open, rename, selectRule } from '../store/lootFilterSlice';
import { selectDiagnostics, selectEditor, selectLibraryEntry, selectLibraryHydrated } from '../store/selectors';
import { downloadTextFile, filterFileName } from '../utils/download';

// Same styling as the Game Data sub-page tabs
const TAB_BASE = 'rounded-md px-3 py-2 text-sm font-medium transition-colors';
const TAB_INACTIVE = 'text-muted-foreground hover:text-foreground';
const TAB_ACTIVE = 'bg-accent text-accent-foreground';

function scrollToDiagnostics() {
  // After the JSON tab has rendered.
  requestAnimationFrame(() => {
    document.getElementById(DIAGNOSTICS_LIST_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

export function LootFilterEditorScreen() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const hydrated = useSelector(selectLibraryHydrated);
  const entry = useSelector((state: RootState) => selectLibraryEntry(state, id));
  const editor = useSelector(selectEditor);
  const { reference } = useLootFilterReference();
  const diagnostics = useSelector((state: RootState) => selectDiagnostics(state, reference));
  const [tab, setTab] = useEditorTab();
  const entryExists = entry !== undefined;

  // Open the entry once the library is loaded; closing (route change, unmount) writes pending edits back.
  useEffect(() => {
    if (!hydrated || !entryExists || id === undefined) return;
    dispatch(open(id));
    return () => {
      dispatch(close());
    };
  }, [dispatch, hydrated, entryExists, id]);

  // Leaving the page before the debounced save: write pending edits now.
  useEffect(() => {
    const flush = () => {
      dispatch(editorFlushed());
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [dispatch]);

  if (!hydrated || (entryExists && editor.id !== id)) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!entry) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Filter not found</CardTitle>
          <CardDescription>It may have been deleted, or it was saved in another browser.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/loot-filters">
              <ArrowLeft />
              Back to library
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const filter = editor.filter;

  const handleDownload = () => {
    downloadTextFile(filterFileName(entry.name), filter === null ? entry.text : serializeLootFilter(filter));
  };

  const showDiagnostics = () => {
    setTab('json');
    scrollToDiagnostics();
  };

  const showRule = (index: number) => {
    dispatch(selectRule(index));
    setTab('rules');
    window.scrollTo({ top: 0 });
  };

  const renderTab = (active: EditorTab) => {
    if (active === 'json') return <JsonTab filter={filter} entryText={entry.text} diagnostics={diagnostics} onShowRule={showRule} />;
    if (filter === null) {
      return (
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="size-4 text-destructive" aria-hidden />
              This filter cannot be read
            </CardTitle>
            <CardDescription>Its text is not valid JSON. Fix it in the JSON tab, then the other tabs open.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setTab('json');
              }}
            >
              Open the JSON tab
            </Button>
          </CardContent>
        </Card>
      );
    }
    switch (active) {
      case 'rules':
        return <RulesTab filter={filter} selectedRule={editor.selectedRule} />;
      case 'styles':
        return <StylesTab filter={filter} />;
      case 'settings':
        return <SettingsTab filter={filter} />;
      case 'test':
        return <TestTab filter={filter} />;
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 space-y-3 border-b pb-3">
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-muted-foreground">
          <Link to="/loot-filters">
            <ArrowLeft />
            Back to library
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <InlineName name={entry.name} onRename={(name) => dispatch(rename({ id: entry.id, name }))} />
          <div className="flex flex-wrap items-center gap-2">
            <DiagnosticsChip diagnostics={diagnostics} onClick={showDiagnostics} />
            <Button size="sm" onClick={handleDownload}>
              <Download />
              Download
            </Button>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="Filter editor tabs">
          {EDITOR_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={tab === item.id ? 'page' : undefined}
              className={cn(TAB_BASE, tab === item.id ? TAB_ACTIVE : TAB_INACTIVE)}
              onClick={() => {
                setTab(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      {renderTab(tab)}
    </div>
  );
}
