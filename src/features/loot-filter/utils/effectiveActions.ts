/** The actions a rule ends up with (its style underneath) and what the editor's label preview shows. */
import { ACTION_KEYS } from '../engine/parse';
import { resolveText } from '../engine/text';
import type { LootFilter, RuleActions } from '../engine/types';

type MutableActions = { -readonly [K in keyof RuleActions]: RuleActions[K] };

// The type parameter ties `key` to the value written through it; without it the assignment does not type-check.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function copyAction<K extends keyof RuleActions>(target: MutableActions, key: K, own: RuleActions, style: RuleActions | undefined): void {
  const value = own[key] ?? style?.[key];
  if (value !== undefined) target[key] = value;
}

/** `style`'s actions with `own` on top, per key (the plugin's rule: the rule's own actions win). `passthrough` is left out. */
export function mergeActions(own: RuleActions, style: RuleActions | undefined): RuleActions {
  const result: MutableActions = {};
  for (const key of ACTION_KEYS) copyAction(result, key, own, style);
  return result;
}

/** The style `actions.useStyle` names, or undefined when it is unset or missing from the filter. */
export function findStyle(actions: RuleActions, filter: LootFilter): RuleActions | undefined {
  return actions.useStyle === undefined ? undefined : filter.styles?.[actions.useStyle];
}

/** The actions after `useStyle` is applied; a missing style is ignored. */
export function effectiveActions(actions: RuleActions, filter: LootFilter): RuleActions {
  return mergeActions(actions, findStyle(actions, filter));
}

/** The sample item name the preview puts in for `{name}`. */
export const PREVIEW_ITEM_NAME = 'Item Name';

/** Replaces `{name}` with the sample name; every other placeholder stays as written. */
export function previewPlaceholders(text: string): string {
  return text.replaceAll('{name}', PREVIEW_ITEM_NAME);
}

/** The ground label text: prefix + (replaceName, else `{name}`) + suffix, in enUS, with `{name}` filled in. */
export function previewLabelText(actions: RuleActions): string {
  const text =
    (resolveText(actions.namePrefix) ?? '') + (resolveText(actions.replaceName) ?? '{name}') + (resolveText(actions.nameSuffix) ?? '');
  return previewPlaceholders(text);
}

/** How many action keys are set (`comment` and unknown keys not counted). */
export function countActions(actions: RuleActions): number {
  return ACTION_KEYS.filter((key) => key !== 'comment' && actions[key] !== undefined).length;
}

/** How many rules pull in the style `name`. */
export function countStyleUsers(filter: LootFilter, name: string): number {
  return filter.rules.filter((rule) => rule.useStyle === name).length;
}
