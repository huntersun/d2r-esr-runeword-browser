import type { LootFilter, RuleActions } from '../../engine/types';
import type { ShallowPatch } from '../../utils/patch';

export interface ActionsEditorProps {
  /** The actions being edited (a rule's own actions, or a style's). */
  readonly actions: RuleActions;
  /** Shallow patch: a key with `undefined` removes it. The caller dispatches `patchRule` or `setStyle`. */
  readonly onChange: (patch: ShallowPatch<RuleActions>) => void;
  /** The whole filter, for the style list (`useStyle`), the quality colours and the label preview. */
  readonly filter: LootFilter;
  /** `rule`: offers `useStyle` and previews the style's actions underneath; `style`: no `useStyle`. */
  readonly owner: 'rule' | 'style';
  /** Name of the style being edited (for the preview heading); unused for rules. */
  readonly styleName?: string;
}

/**
 * Form for every action key of the guide (names, label colours, chat, notify, sound, icon, droplight,
 * useStyle, comment, hide…). Contract stub: the actions/styles phase replaces this file with the real editor.
 */
export function ActionsEditor({ actions }: ActionsEditorProps) {
  const count = Object.keys(actions).filter((key) => key !== 'passthrough').length;
  return (
    <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
      Actions editor: coming in the next phase ({String(count)} actions set; edit them in the JSON tab).
    </div>
  );
}
