/**
 * URL param keys owned by the game-data pages. Shared keys (`search`, `sockets`, `maxlvl`) come from
 * `FILTER_URL_PARAM_KEYS` in `@/core/utils/filterUrlParams`. Keys are per page, so `cls`, `type` and `sort` mean
 * the same kind of filter on Bases and Affixes.
 */
export const GAME_DATA_URL_PARAM_KEYS = {
  KIND: 'kind',
  TIER: 'tier',
  CLS: 'cls',
  TYPE: 'type',
  SORT: 'sort',
  // Best base
  RW: 'rw',
  VARIANT: 'v',
  LVL: 'lvl',
  STR: 'str',
  DEX: 'dex',
  // Affixes
  BASE: 'base',
  ILVL: 'ilvl',
  AFF: 'aff',
  RARE: 'rare',
  MINLVL: 'minlvl',
  QUALITY: 'q',
  AUTO: 'auto',
} as const;
