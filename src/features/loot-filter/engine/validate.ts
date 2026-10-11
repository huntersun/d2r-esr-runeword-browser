/**
 * Semantic checks on the typed model (shape errors are reported by the parser, not here).
 * Reference checks (item codes, stats, areas, sounds…) run only when a reference is given and the
 * relevant set is non-empty, and they are warnings: the game data may lag behind the mod.
 */
import { CONDITION_KEYS } from './parse.ts';
import {
  BASE_TIERS,
  DIFFICULTIES,
  QUALITIES,
  STAT_OPS,
  type Diagnostic,
  type DiagnosticSeverity,
  type LabelColor,
  type LootFilter,
  type LootFilterReference,
  type LootFilterRule,
  type NamedMatch,
  type NamedValue,
  type NumberMatch,
  type RuleActions,
  type StatCheck,
} from './types.ts';

/** Sound file extensions the plugin plays from the filter's `sounds` folder. */
export const SOUND_FILE_EXTENSIONS = ['.wav', '.mp3', '.flac'] as const;

/** Actions that only show on a ground item (label, minimap icon, droplight). */
const GROUND_ONLY_ACTIONS = ['labelBackground', 'labelBorder', 'icon', 'droplight'] as const;

/** Keys that make a rule do something; `comment` does not count. */
const EFFECT_KEYS = [
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
] as const satisfies readonly (keyof RuleActions)[];

interface Owner {
  readonly path: string;
  readonly rule?: number;
  readonly style?: string;
}

type Report = (severity: DiagnosticSeverity, key: string, message: string) => void;

function reporter(diagnostics: Diagnostic[], owner: Owner): Report {
  return (severity, key, message) => {
    diagnostics.push({
      severity,
      message,
      path: [owner.path, key].filter((part) => part !== '').join('/'),
      ...(owner.rule === undefined ? {} : { rule: owner.rule }),
      ...(owner.style === undefined ? {} : { style: owner.style }),
    });
  };
}

// Array.isArray does not narrow readonly arrays out of a union, so these guards do.
function isNumberList(value: NumberMatch): value is readonly number[] {
  return Array.isArray(value);
}

function isNamedList<N extends string>(value: NamedMatch<N>): value is readonly NamedValue<N>[] {
  return Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Value checks
// ---------------------------------------------------------------------------

function checkNumberMatch(report: Report, key: string, match: NumberMatch | undefined, min: number, max: number): void {
  if (match === undefined) return;
  const range = `${String(min)} to ${String(max)}`;
  if (typeof match === 'number') {
    if (match < min || match > max) report('warning', key, `"${key}" ${String(match)} is outside ${range}`);
    return;
  }
  if (isNumberList(match)) {
    match.forEach((value, index) => {
      if (value < min || value > max) report('warning', `${key}/${String(index)}`, `"${key}" ${String(value)} is outside ${range}`);
    });
    return;
  }
  for (const bound of ['min', 'max'] as const) {
    const value = match[bound];
    if (value !== undefined && (value < min || value > max)) {
      report('warning', `${key}/${bound}`, `"${key}" ${bound} ${String(value)} is outside ${range}`);
    }
  }
  if (match.min !== undefined && match.max !== undefined && match.min > match.max) {
    report('warning', key, `"${key}" min ${String(match.min)} is greater than max ${String(match.max)}; nothing matches`);
  }
}

/** Checks a named match; `offset` is the number of the first name (quality 1, the others 0). */
function checkNamedMatch<N extends string>(
  report: Report,
  key: string,
  match: NamedMatch<N> | undefined,
  names: readonly N[],
  offset: number,
  what: string
): void {
  if (match === undefined) return;
  const toNumber = (value: NamedValue<N>, path: string): number | undefined => {
    if (typeof value === 'number') {
      if (Number.isInteger(value) && value >= offset && value < offset + names.length) return value;
      report('error', path, `Unknown ${what} ${String(value)} (${String(offset)} to ${String(offset + names.length - 1)})`);
      return undefined;
    }
    const index = names.indexOf(value);
    if (index >= 0) return index + offset;
    report('error', path, `Unknown ${what} "${value}" (${names.join(', ')})`);
    return undefined;
  };
  if (typeof match === 'number' || typeof match === 'string') {
    toNumber(match, key);
    return;
  }
  if (isNamedList(match)) {
    match.forEach((value, index) => toNumber(value, `${key}/${String(index)}`));
    return;
  }
  const low = match.min === undefined ? undefined : toNumber(match.min, `${key}/min`);
  const high = match.max === undefined ? undefined : toNumber(match.max, `${key}/max`);
  if (low !== undefined && high !== undefined && low > high) {
    report('warning', key, `"${key}" min is above max; nothing matches`);
  }
}

function checkColor(report: Report, key: string, color: LabelColor | undefined, lengths: readonly number[]): void {
  if (color === undefined) return;
  if (!lengths.includes(color.length)) {
    report('error', key, `"${key}" needs ${lengths.join(' or ')} numbers, not ${String(color.length)}`);
  }
  color.forEach((component, index) => {
    if (!Number.isInteger(component) || component < 0 || component > 255) {
      report('error', `${key}/${String(index)}`, `Colour component ${String(component)} is not a whole number from 0 to 255`);
    }
  });
}

function checkStats(
  report: Report,
  key: string,
  checks: readonly StatCheck[] | undefined,
  reference: LootFilterReference | undefined
): void {
  checks?.forEach((check, index) => {
    const path = `${key}/${String(index)}`;
    if (check.op !== undefined && !(STAT_OPS as readonly string[]).includes(check.op)) {
      report('error', `${path}/op`, `Unknown op "${check.op}" (${STAT_OPS.join(' ')})`);
    }
    const isPair = typeof check.value !== 'number';
    if (check.op === 'between' && !isPair) report('error', `${path}/value`, '"between" needs "value": [low, high]');
    if (check.op !== 'between' && isPair)
      report('error', `${path}/value`, `A [low, high] value needs "op": "between", not "${check.op ?? '>='}"`);
    if (isPair && check.value[0] > check.value[1]) report('warning', `${path}/value`, 'The low end is above the high end; nothing matches');
    if (!reference) return;
    if (typeof check.stat === 'number') {
      if (reference.statIds.size > 0 && !reference.statIds.has(check.stat)) {
        report('warning', `${path}/stat`, `Unknown stat id ${String(check.stat)}`);
      }
    } else if (reference.statNames.size > 0 && !reference.statNames.has(check.stat)) {
      report('warning', `${path}/stat`, `Unknown stat "${check.stat}"`);
    }
  });
}

function checkKnown<T extends string | number>(
  report: Report,
  key: string,
  values: readonly T[] | undefined,
  known: ReadonlySet<T> | undefined,
  what: string
): void {
  if (!values || !known || known.size === 0) return;
  values.forEach((value, index) => {
    if (!known.has(value)) report('warning', `${key}/${String(index)}`, `Unknown ${what} ${JSON.stringify(value)}`);
  });
}

function isSoundFile(name: string): boolean {
  const lower = name.toLowerCase();
  return SOUND_FILE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function checkSound(report: Report, sound: string | number | undefined, reference: LootFilterReference | undefined): void {
  if (sound === undefined || !reference) return;
  const row = typeof sound === 'number' ? sound : /^\d+$/.test(sound) ? Number(sound) : undefined;
  if (row !== undefined) {
    if (reference.soundRowCount > 0 && (!Number.isInteger(row) || row < 0 || row >= reference.soundRowCount)) {
      report('warning', 'sound', `sounds.txt has no row ${String(row)}`);
    }
    return;
  }
  if (typeof sound !== 'string' || isSoundFile(sound) || reference.soundNames.size === 0) return;
  if (!reference.soundNames.has(sound)) {
    report('warning', 'sound', `"${sound}" is neither a sounds.txt sound nor a .wav, .mp3 or .flac file`);
  }
}

function checkActions(report: Report, actions: RuleActions, reference: LootFilterReference | undefined): void {
  checkColor(report, 'labelBackground', actions.labelBackground, [3, 4]);
  if (actions.labelBorder) {
    checkColor(report, 'labelBorder/color', actions.labelBorder.color, [3, 4]);
    if (actions.labelBorder.width < 0) report('error', 'labelBorder/width', 'The border width cannot be negative');
  }
  if (actions.icon) {
    const { iconSize } = actions.icon;
    if (iconSize !== undefined && (iconSize < 4 || iconSize > 256))
      report('error', 'icon/iconSize', `"iconSize" ${String(iconSize)} is outside 4 to 256`);
    checkColor(report, 'icon/color', actions.icon.color, [3, 4]);
  }
  checkColor(report, 'droplight/color', actions.droplight?.color, [3]);
  if (actions.soundVolume !== undefined && (actions.soundVolume < 0 || actions.soundVolume > 100)) {
    report('error', 'soundVolume', `"soundVolume" ${String(actions.soundVolume)} is outside 0 to 100`);
  }
  checkSound(report, actions.sound, reference);
}

// ---------------------------------------------------------------------------
// Rules and the filter
// ---------------------------------------------------------------------------

function checkRule(
  report: Report,
  rule: LootFilterRule,
  filter: LootFilter,
  levelIds: ReadonlySet<number> | undefined,
  reference: LootFilterReference | undefined
): void {
  const hasConditions = CONDITION_KEYS.some((key) => rule[key] !== undefined);
  const hasEffects = EFFECT_KEYS.some((key) => rule[key] !== undefined);
  if (!hasConditions && !hasEffects) report('warning', '', 'The rule has neither conditions nor actions');
  else if (!hasEffects) report('warning', '', 'The rule has conditions but no actions, so it does nothing');

  if (rule.useStyle !== undefined && filter.styles?.[rule.useStyle] === undefined) {
    report('error', 'useStyle', `There is no style named "${rule.useStyle}"`);
  }
  if (rule.hideIfOtherConditionsFail === true && rule.itemCodes === undefined && rule.itemTypes === undefined) {
    report(
      'warning',
      'hideIfOtherConditionsFail',
      '"hideIfOtherConditionsFail" needs "itemCodes" or "itemTypes" to say which items it hides'
    );
  }

  checkNamedMatch(report, 'quality', rule.quality, QUALITIES, 1, 'quality');
  checkNamedMatch(report, 'baseTier', rule.baseTier, BASE_TIERS, 0, 'base tier');
  checkNamedMatch(report, 'difficulty', rule.difficulty, DIFFICULTIES, 0, 'difficulty');
  checkNumberMatch(report, 'itemLevel', rule.itemLevel, 0, 999);
  checkNumberMatch(report, 'sockets', rule.sockets, 0, 99);
  checkNumberMatch(report, 'maxSockets', rule.maxSockets, 0, 99);

  rule.activeInLevels?.forEach((id, index) => {
    if (!levelIds)
      report('error', `activeInLevels/${String(index)}`, `Level ${String(id)} does not exist: the filter has no "filterLevels"`);
    else if (!levelIds.has(id)) report('error', `activeInLevels/${String(index)}`, `There is no filter level with id ${String(id)}`);
  });

  for (const key of ['itemStats', 'itemStatsAnyOf', 'playerStats', 'playerStatsAnyOf'] as const)
    checkStats(report, key, rule[key], reference);

  if (rule.location !== undefined && !rule.location.includes('onGround')) {
    for (const key of GROUND_ONLY_ACTIONS) {
      if (rule[key] !== undefined)
        report('warning', key, `"${key}" shows on ground items only, but the rule's "location" leaves out onGround`);
    }
  }

  checkActions(report, rule, reference);
  checkKnown(report, 'itemCodes', rule.itemCodes, reference?.itemCodes, 'item code');
  checkKnown(report, 'excludeItemCodes', rule.excludeItemCodes, reference?.itemCodes, 'item code');
  checkKnown(report, 'itemTypes', rule.itemTypes, reference?.itemTypes, 'item type');
  checkKnown(report, 'excludeItemTypes', rule.excludeItemTypes, reference?.itemTypes, 'item type');
  checkKnown(report, 'areas', rule.areas, reference?.areaIds, 'area id');
  checkKnown(report, 'excludeAreas', rule.excludeAreas, reference?.areaIds, 'area id');
  checkKnown(report, 'uniqueOrSetIds', rule.uniqueOrSetIds, reference?.uniqueOrSetIds, 'unique or set id');
  checkKnown(report, 'excludeUniqueOrSetIds', rule.excludeUniqueOrSetIds, reference?.uniqueOrSetIds, 'unique or set id');
}

/** Semantic diagnostics for a parsed (or edited) filter. */
export function validateLootFilter(filter: LootFilter, reference?: LootFilterReference): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const top = reporter(diagnostics, { path: '' });

  let levelIds: Set<number> | undefined;
  if (filter.filterLevels) {
    levelIds = new Set();
    for (const [index, level] of filter.filterLevels.entries()) {
      if (levelIds.has(level.id)) top('error', `filterLevels/${String(index)}/id`, `Level id ${String(level.id)} is used twice`);
      levelIds.add(level.id);
    }
  }
  if (filter.defaultLevel !== undefined && !levelIds?.has(filter.defaultLevel)) {
    top('error', 'defaultLevel', `"defaultLevel" ${String(filter.defaultLevel)} is not one of the filter levels`);
  }
  if (filter.soundVolume !== undefined && (filter.soundVolume < 0 || filter.soundVolume > 100)) {
    top('error', 'soundVolume', `"soundVolume" ${String(filter.soundVolume)} is outside 0 to 100`);
  }

  for (const [name, style] of Object.entries(filter.styles ?? {})) {
    const report = reporter(diagnostics, { path: `styles/${name}`, style: name });
    if (style.useStyle !== undefined) report('error', 'useStyle', 'Styles hold actions only; a style cannot use another style');
    checkActions(report, style, reference);
  }

  filter.rules.forEach((rule, index) => {
    checkRule(reporter(diagnostics, { path: `rules/${String(index)}`, rule: index }), rule, filter, levelIds, reference);
  });
  return diagnostics;
}
