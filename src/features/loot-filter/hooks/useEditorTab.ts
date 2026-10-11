import { useSearchParams } from 'react-router-dom';

export const EDITOR_TABS = [
  { id: 'rules', label: 'Rules' },
  { id: 'styles', label: 'Styles' },
  { id: 'settings', label: 'Settings' },
  { id: 'json', label: 'JSON' },
  { id: 'test', label: 'Test' },
] as const;

export type EditorTab = (typeof EDITOR_TABS)[number]['id'];

const DEFAULT_TAB: EditorTab = 'rules';

function isEditorTab(value: string | null): value is EditorTab {
  return EDITOR_TABS.some((tab) => tab.id === value);
}

/** The editor's active tab, kept in `?tab=` so it is bookmarkable; unknown values fall back to Rules. */
export function useEditorTab(): readonly [EditorTab, (tab: EditorTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab');
  const tab = isEditorTab(raw) ? raw : DEFAULT_TAB;
  const setTab = (next: EditorTab) => {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        if (next === DEFAULT_TAB) params.delete('tab');
        else params.set('tab', next);
        return params;
      },
      { replace: true }
    );
  };
  return [tab, setTab];
}
