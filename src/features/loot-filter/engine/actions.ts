/** The actions a rule ends up with: its style's actions with the rule's own on top. */
import { ACTION_KEYS } from './parse.ts';
import type { LootFilter, RuleActions } from './types.ts';

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
  const { styles } = filter;
  const name = actions.useStyle;
  return name === undefined || styles === undefined || !Object.hasOwn(styles, name) ? undefined : styles[name];
}

/** The actions after `useStyle` is applied; a missing style is ignored. */
export function effectiveActions(actions: RuleActions, filter: LootFilter): RuleActions {
  return mergeActions(actions, findStyle(actions, filter));
}
