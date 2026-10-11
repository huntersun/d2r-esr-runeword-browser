/** The actions a rule ends up with (its style underneath) and what the editor's label preview shows. */
import { EFFECT_KEYS } from '../engine/parse';
import { resolveText } from '../engine/text';
import type { LootFilter, RuleActions } from '../engine/types';

export { effectiveActions, findStyle, mergeActions } from '../engine/actions';

/** The sample item name the preview puts in for `{name}`. */
const PREVIEW_ITEM_NAME = 'Item Name';

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
  return EFFECT_KEYS.filter((key) => actions[key] !== undefined).length;
}

/** How many rules pull in the style `name`. */
export function countStyleUsers(filter: LootFilter, name: string): number {
  return filter.rules.filter((rule) => rule.useStyle === name).length;
}
