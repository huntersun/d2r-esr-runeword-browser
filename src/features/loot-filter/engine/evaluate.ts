/**
 * The "test item" engine: runs a loot filter's rules against one item the way the ESR loot filter plugin
 * does, as described in the author's "ESR Loot Filter Guide" (builds-feature-docs/loot-filter/ESR-LOOT-FILTER-GUIDE.md).
 *
 * Assumptions where the guide is silent (verify in game):
 * - `activeInLevels` is a precondition: a rule inactive at the current level is skipped and never hides,
 *   not even with `hideIfOtherConditionsFail`.
 * - The `hideIfOtherConditionsFail` gate is `itemCodes`, `excludeItemCodes`, `itemTypes`, `excludeItemTypes`
 *   and `location` (the guide's "codes, types and location"); every other condition is an "other condition".
 * - A hidden item keeps no label colours, border, icon, droplight, chat lines or sounds from earlier rules;
 *   its only chat line is the hiding rule's `chatMessageWhenHidden`. The name is still computed.
 * - The hiding rule's other actions (sound, chatMessage, name, colours) do not apply.
 * - `replaceName`, `namePrefix` and `nameSuffix` are each "later wins" on their own, not as one name.
 * - `notify: true` prints the drop line unless the rule's effective actions (style included) have a chatMessage.
 * - `{name}` in every text, the drop line included, is the game's name, not the filter's changed name.
 * - A stat check without `param` holds when any entry of that stat satisfies it; an entry without param has param 0;
 *   a stat the item or player lacks is one entry of value 0.
 * - `{stat:ID}` without PARAM shows the first entry of that stat; ID may also be an itemstatcost name.
 * - `{ethereal}` expands to `Ethereal` for ethereal items and to an empty string otherwise.
 * - `hideUnmatchedItems` hides an on-ground item no rule applied to (`hiddenBy` stays null).
 */

import type {
  Droplight,
  FilterText,
  ItemLocation,
  LabelBorder,
  LabelColor,
  Language,
  LootFilter,
  LootFilterRule,
  MinimapIcon,
  NamedMatch,
  NumberMatch,
  QualityName,
  RgbaColor,
  RuleActions,
  StatCheck,
} from './types';
import { BASE_TIERS, DEFAULT_LABEL_BACKGROUND_ALPHA, DIFFICULTIES, QUALITIES } from './types';
import { DEFAULT_QUALITY_COLORS } from './colors';
import { resolveText } from './text';

export interface ItemStatEntry {
  readonly stat: number;
  readonly param?: number;
  readonly value: number;
}

export interface TestItem {
  readonly code: string;
  /** The item's type and all of its parent types (itemtypes.txt codes). */
  readonly typeAncestors: readonly string[];
  /** 1 (inferior) to 9 (tempered). */
  readonly quality: number;
  /** 0 (normal) to 2 (elite). */
  readonly baseTier: number;
  readonly itemLevel: number;
  readonly sockets: number;
  readonly maxSockets: number;
  readonly isFullySocketed: boolean;
  readonly isEthereal: boolean;
  readonly isIdentified: boolean;
  readonly isRuneword: boolean;
  readonly uniqueOrSetId: number | null;
  readonly stats: readonly ItemStatEntry[];
  /** The game's own name. */
  readonly name: string;
  readonly location: ItemLocation;
}

export interface TestContext {
  readonly playerStats: readonly ItemStatEntry[];
  /** 0 (normal) to 2 (hell). */
  readonly difficulty: number;
  /** levels.txt Id */
  readonly area: number;
  readonly filterLevel: number;
  /** itemstatcost.txt name → id, for stat checks written with names. */
  readonly statIds: ReadonlyMap<string, number>;
  readonly language?: Language;
}

export interface RuleTrace {
  readonly index: number;
  readonly outcome: 'applied' | 'skipped' | 'hidden' | 'hiddenByOtherConditions';
  /** Condition keys that did not hold; empty when applied. */
  readonly failed: readonly string[];
  /** The style's actions with the rule's own on top; empty when skipped. */
  readonly actions: RuleActions;
}

export interface EvaluatedSound {
  readonly sound: string | number;
  readonly volume: number;
}

export interface EvaluationResult {
  readonly trace: readonly RuleTrace[];
  /** Some rule applied (or hid the item). */
  readonly matched: boolean;
  readonly hidden: boolean;
  readonly hiddenBy: number | null;
  /** Final label text with raw ÿc codes, placeholders expanded. */
  readonly name: string;
  readonly replaceName: string | undefined;
  readonly namePrefix: string | undefined;
  readonly nameSuffix: string | undefined;
  readonly labelBackground: RgbaColor | null;
  readonly labelBorder: LabelBorder | null;
  readonly chatMessages: readonly string[];
  readonly notified: boolean;
  readonly sounds: readonly EvaluatedSound[];
  readonly icon: MinimapIcon | null;
  readonly droplight: Droplight | null;
}

const DEFAULT_DROP_FORMAT = '{qualityColor}{name}';
const DEFAULT_LOCATIONS: readonly ItemLocation[] = ['onGround'];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function qualityName(quality: number): QualityName | undefined {
  return QUALITIES[quality - 1];
}

function isNumberList(value: NumberMatch): value is readonly number[] {
  return Array.isArray(value);
}

function matchesNumber(match: NumberMatch, actual: number): boolean {
  if (typeof match === 'number') return match === actual;
  if (isNumberList(match)) return match.includes(actual);
  return (match.min === undefined || actual >= match.min) && (match.max === undefined || actual <= match.max);
}

/** Resolves a name or number to its number; `offset` is 1 for the 1-based qualities. */
function namedToNumber(value: string | number, names: readonly string[], offset: number): number | undefined {
  if (typeof value === 'number') return value;
  const index = names.indexOf(value);
  return index < 0 ? undefined : index + offset;
}

function isNamedList(match: NamedMatch<string>): match is readonly (string | number)[] {
  return Array.isArray(match);
}

function matchesNamed(match: NamedMatch<string>, actual: number, names: readonly string[], offset: number): boolean {
  if (typeof match === 'string' || typeof match === 'number') return namedToNumber(match, names, offset) === actual;
  if (isNamedList(match)) return match.some((value) => namedToNumber(value, names, offset) === actual);
  const min = match.min === undefined ? undefined : namedToNumber(match.min, names, offset);
  const max = match.max === undefined ? undefined : namedToNumber(match.max, names, offset);
  if (match.min !== undefined && min === undefined) return false;
  if (match.max !== undefined && max === undefined) return false;
  return (min === undefined || actual >= min) && (max === undefined || actual <= max);
}

function resolveStatId(stat: string | number, statIds: ReadonlyMap<string, number>): number | undefined {
  if (typeof stat === 'number') return stat;
  if (/^\d+$/.test(stat)) return Number(stat);
  return statIds.get(stat);
}

/** The values a stat check compares: every entry of that stat (and param), or a single 0 when there is none. */
function statValues(entries: readonly ItemStatEntry[], stat: number, param: number | undefined): readonly number[] {
  const values = entries
    .filter((entry) => entry.stat === stat && (param === undefined || (entry.param ?? 0) === param))
    .map((entry) => entry.value);
  return values.length > 0 ? values : [0];
}

function compare(op: StatCheck['op'], actual: number, value: StatCheck['value']): boolean {
  if (op === 'between') {
    if (typeof value === 'number') return false;
    return actual >= value[0] && actual <= value[1];
  }
  if (typeof value !== 'number') return false;
  switch (op) {
    case '==':
      return actual === value;
    case '!=':
      return actual !== value;
    case '>':
      return actual > value;
    case '<':
      return actual < value;
    case '<=':
      return actual <= value;
    case '>=':
    case undefined:
      return actual >= value;
  }
}

function statCheckHolds(check: StatCheck, entries: readonly ItemStatEntry[], statIds: ReadonlyMap<string, number>): boolean {
  const id = resolveStatId(check.stat, statIds);
  if (id === undefined) return false;
  return statValues(entries, id, check.param).some((actual) => compare(check.op, actual, check.value));
}

function withAlpha(color: LabelColor): RgbaColor {
  return color.length === 4 ? color : [color[0], color[1], color[2], DEFAULT_LABEL_BACKGROUND_ALPHA];
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

type ConditionKey = keyof LootFilterRule;

/** Keys that decide whether `hideIfOtherConditionsFail` may hide the item. */
const GATE_KEYS: ReadonlySet<string> = new Set(['itemCodes', 'excludeItemCodes', 'itemTypes', 'excludeItemTypes', 'location']);

/** Returns the keys of the rule's conditions that do not hold, in a stable order. */
function failedConditions(rule: LootFilterRule, item: TestItem, context: TestContext): readonly string[] {
  const failed: ConditionKey[] = [];
  const check = (key: ConditionKey, present: boolean, holds: () => boolean): void => {
    if (present && !holds()) failed.push(key);
  };
  const { statIds } = context;

  check('itemCodes', rule.itemCodes !== undefined, () => rule.itemCodes?.includes(item.code) ?? true);
  check('excludeItemCodes', rule.excludeItemCodes !== undefined, () => !(rule.excludeItemCodes?.includes(item.code) ?? false));
  check('itemTypes', rule.itemTypes !== undefined, () => rule.itemTypes?.some((type) => item.typeAncestors.includes(type)) ?? true);
  check(
    'excludeItemTypes',
    rule.excludeItemTypes !== undefined,
    () => !(rule.excludeItemTypes?.some((type) => item.typeAncestors.includes(type)) ?? false)
  );
  check('quality', rule.quality !== undefined, () => rule.quality === undefined || matchesNamed(rule.quality, item.quality, QUALITIES, 1));
  check(
    'baseTier',
    rule.baseTier !== undefined,
    () => rule.baseTier === undefined || matchesNamed(rule.baseTier, item.baseTier, BASE_TIERS, 0)
  );
  check('itemLevel', rule.itemLevel !== undefined, () => rule.itemLevel === undefined || matchesNumber(rule.itemLevel, item.itemLevel));
  check('sockets', rule.sockets !== undefined, () => rule.sockets === undefined || matchesNumber(rule.sockets, item.sockets));
  check(
    'maxSockets',
    rule.maxSockets !== undefined,
    () => rule.maxSockets === undefined || matchesNumber(rule.maxSockets, item.maxSockets)
  );
  check('isFullySocketed', rule.isFullySocketed !== undefined, () => rule.isFullySocketed === item.isFullySocketed);
  check('isEthereal', rule.isEthereal !== undefined, () => rule.isEthereal === item.isEthereal);
  check('isIdentified', rule.isIdentified !== undefined, () => rule.isIdentified === item.isIdentified);
  check('isRuneword', rule.isRuneword !== undefined, () => rule.isRuneword === item.isRuneword);
  check(
    'uniqueOrSetIds',
    rule.uniqueOrSetIds !== undefined,
    () => item.uniqueOrSetId !== null && (rule.uniqueOrSetIds?.includes(item.uniqueOrSetId) ?? true)
  );
  check(
    'excludeUniqueOrSetIds',
    rule.excludeUniqueOrSetIds !== undefined,
    () => item.uniqueOrSetId === null || !(rule.excludeUniqueOrSetIds?.includes(item.uniqueOrSetId) ?? false)
  );
  check('itemStats', rule.itemStats !== undefined, () => (rule.itemStats ?? []).every((stat) => statCheckHolds(stat, item.stats, statIds)));
  check('itemStatsAnyOf', rule.itemStatsAnyOf !== undefined, () =>
    (rule.itemStatsAnyOf ?? []).some((stat) => statCheckHolds(stat, item.stats, statIds))
  );
  check('playerStats', rule.playerStats !== undefined, () =>
    (rule.playerStats ?? []).every((stat) => statCheckHolds(stat, context.playerStats, statIds))
  );
  check('playerStatsAnyOf', rule.playerStatsAnyOf !== undefined, () =>
    (rule.playerStatsAnyOf ?? []).some((stat) => statCheckHolds(stat, context.playerStats, statIds))
  );
  check('location', true, () => (rule.location ?? DEFAULT_LOCATIONS).includes(item.location));
  check(
    'difficulty',
    rule.difficulty !== undefined,
    () => rule.difficulty === undefined || matchesNamed(rule.difficulty, context.difficulty, DIFFICULTIES, 0)
  );
  check('areas', rule.areas !== undefined, () => rule.areas?.includes(context.area) ?? true);
  check('excludeAreas', rule.excludeAreas !== undefined, () => !(rule.excludeAreas?.includes(context.area) ?? false));
  check('activeInLevels', rule.activeInLevels !== undefined, () => rule.activeInLevels?.includes(context.filterLevel) ?? true);
  return failed;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type MutableActions = { -readonly [K in keyof RuleActions]: RuleActions[K] };

const ACTION_KEYS: readonly (keyof RuleActions)[] = [
  'hide',
  'hideIfOtherConditionsFail',
  'replaceName',
  'namePrefix',
  'nameSuffix',
  'labelBackground',
  'labelBorder',
  'chatMessage',
  'chatMessageWhenHidden',
  'notify',
  'sound',
  'soundVolume',
  'icon',
  'droplight',
  'useStyle',
  'comment',
];

// The type parameter ties `key` to the value written through it; without it the assignment does not type-check.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function copyAction<K extends keyof RuleActions>(target: MutableActions, key: K, rule: RuleActions, style: RuleActions | undefined): void {
  const value = rule[key] ?? style?.[key];
  if (value !== undefined) target[key] = value;
}

/** The style's actions with the rule's own on top (per key), without undefined keys; a missing style is ignored. */
function effectiveActions(rule: LootFilterRule, filter: LootFilter): RuleActions {
  const style = rule.useStyle === undefined ? undefined : filter.styles?.[rule.useStyle];
  const result: MutableActions = {};
  for (const key of ACTION_KEYS) copyAction(result, key, rule, style);
  return result;
}

// ---------------------------------------------------------------------------
// Placeholders
// ---------------------------------------------------------------------------

function qualityColor(item: TestItem, filter: LootFilter): string {
  const name = qualityName(item.quality);
  if (name === undefined) return '';
  return filter.qualityColors?.[name] ?? DEFAULT_QUALITY_COLORS[name];
}

function statPlaceholder(args: string, entries: readonly ItemStatEntry[], statIds: ReadonlyMap<string, number>): string | undefined {
  const comma = args.indexOf(',');
  const id = resolveStatId((comma < 0 ? args : args.slice(0, comma)).trim(), statIds);
  if (id === undefined) return undefined;
  const rawParam = comma < 0 ? '' : args.slice(comma + 1).trim();
  const param = rawParam === '' ? undefined : Number(rawParam);
  if (param !== undefined && Number.isNaN(param)) return undefined;
  const entry = entries.find((candidate) => candidate.stat === id && (param === undefined || (candidate.param ?? 0) === param));
  return String(entry?.value ?? 0);
}

/** Expands the guide's placeholders in one text; unknown ones (and `{string:KEY}`) are left as they are. */
export function expandPlaceholders(text: string, item: TestItem, context: TestContext, filter: LootFilter): string {
  return text.replace(/\{([A-Za-z]+)(?::([^{}]*))?\}/g, (whole: string, key: string, args: string | undefined) => {
    if (args !== undefined) {
      if (key === 'stat') return statPlaceholder(args, item.stats, context.statIds) ?? whole;
      if (key === 'playerStat') return statPlaceholder(args, context.playerStats, context.statIds) ?? whole;
      return whole;
    }
    switch (key) {
      case 'name':
      case 'link':
        return item.name;
      case 'code':
        return item.code;
      case 'quality':
        return qualityName(item.quality) ?? String(item.quality);
      case 'baseTier':
        return BASE_TIERS[item.baseTier] ?? String(item.baseTier);
      case 'itemLevel':
        return String(item.itemLevel);
      case 'sockets':
        return String(item.sockets);
      case 'maxSockets':
        return String(item.maxSockets);
      case 'ethereal':
        return item.isEthereal ? 'Ethereal' : '';
      case 'uniqueOrSetId':
        return item.uniqueOrSetId === null ? '' : String(item.uniqueOrSetId);
      case 'qualityColor':
        return qualityColor(item, filter);
      default:
        return whole;
    }
  });
}

// ---------------------------------------------------------------------------
// The evaluator
// ---------------------------------------------------------------------------

export function evaluateFilter(filter: LootFilter, item: TestItem, context: TestContext): EvaluationResult {
  const { language } = context;
  const text = (value: FilterText): string => expandPlaceholders(resolveText(value, language) ?? '', item, context, filter);

  const trace: RuleTrace[] = [];
  let matched = false;
  let hiddenBy: number | null = null;
  let hiddenMessage: string | undefined;
  let replaceName: FilterText | undefined;
  let namePrefix: FilterText | undefined;
  let nameSuffix: FilterText | undefined;
  let labelBackground: LabelColor | undefined;
  let labelBorder: LabelBorder | undefined;
  let icon: MinimapIcon | undefined;
  let droplight: Droplight | undefined;
  let notified = false;
  const chatMessages: string[] = [];
  const sounds: EvaluatedSound[] = [];

  for (const [index, rule] of filter.rules.entries()) {
    const failed = failedConditions(rule, item, context);
    if (failed.length > 0) {
      const actions = effectiveActions(rule, filter);
      const gateHolds = failed.every((key) => !GATE_KEYS.has(key)) && !failed.includes('activeInLevels');
      if (actions.hideIfOtherConditionsFail === true && gateHolds) {
        trace.push({ index, outcome: 'hiddenByOtherConditions', failed, actions });
        hiddenBy = index;
        if (actions.chatMessageWhenHidden !== undefined) hiddenMessage = text(actions.chatMessageWhenHidden);
        break;
      }
      trace.push({ index, outcome: 'skipped', failed, actions: {} });
      continue;
    }

    const actions = effectiveActions(rule, filter);
    matched = true;
    if (actions.hide === true) {
      trace.push({ index, outcome: 'hidden', failed, actions });
      hiddenBy = index;
      if (actions.chatMessageWhenHidden !== undefined) hiddenMessage = text(actions.chatMessageWhenHidden);
      break;
    }

    trace.push({ index, outcome: 'applied', failed, actions });
    replaceName = actions.replaceName ?? replaceName;
    namePrefix = actions.namePrefix ?? namePrefix;
    nameSuffix = actions.nameSuffix ?? nameSuffix;
    labelBackground = actions.labelBackground ?? labelBackground;
    labelBorder = actions.labelBorder ?? labelBorder;
    icon = actions.icon ?? icon;
    droplight = actions.droplight ?? droplight;
    if (actions.chatMessage !== undefined) {
      chatMessages.push(text(actions.chatMessage));
    } else if (actions.notify === true) {
      chatMessages.push(text(filter.notifications?.dropFormat ?? DEFAULT_DROP_FORMAT));
    }
    if (actions.notify === true) notified = true;
    if (actions.sound !== undefined) {
      sounds.push({ sound: actions.sound, volume: actions.soundVolume ?? filter.soundVolume ?? 100 });
    }
  }

  const resolvedReplace = replaceName === undefined ? undefined : text(replaceName);
  const resolvedPrefix = namePrefix === undefined ? undefined : text(namePrefix);
  const resolvedSuffix = nameSuffix === undefined ? undefined : text(nameSuffix);
  const name = `${resolvedPrefix ?? ''}${resolvedReplace ?? item.name}${resolvedSuffix ?? ''}`;

  const hiddenUnmatched = !matched && hiddenBy === null && filter.hideUnmatchedItems === true && item.location === 'onGround';
  const hidden = hiddenBy !== null || hiddenUnmatched;

  if (hidden) {
    return {
      trace,
      matched: matched || hiddenBy !== null,
      hidden,
      hiddenBy,
      name,
      replaceName: resolvedReplace,
      namePrefix: resolvedPrefix,
      nameSuffix: resolvedSuffix,
      labelBackground: null,
      labelBorder: null,
      chatMessages: hiddenMessage === undefined ? [] : [hiddenMessage],
      notified: false,
      sounds: [],
      icon: null,
      droplight: null,
    };
  }

  return {
    trace,
    matched,
    hidden,
    hiddenBy,
    name,
    replaceName: resolvedReplace,
    namePrefix: resolvedPrefix,
    nameSuffix: resolvedSuffix,
    labelBackground: labelBackground === undefined ? null : withAlpha(labelBackground),
    labelBorder: labelBorder ?? null,
    chatMessages,
    notified,
    sounds,
    icon: icon ?? null,
    droplight: droplight ?? null,
  };
}
