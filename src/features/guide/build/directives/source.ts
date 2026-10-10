/**
 * `::source[Annihilus]`: the "where it comes from" labels of an item from public/game-data/sources.json.
 * Names can collide across item kinds (a set item and a misc item called "Worldstone Shard"); `{item=misc}` picks one.
 */
import { normaliseItemName } from '../../../../core/utils/itemName.ts';
import type { ItemSource } from '../../../game-data/engine/schema.ts';
import type { DirectiveResolver } from './types.ts';

const ITEM_KINDS: readonly ItemSource['item'][] = ['unique', 'set', 'misc'];

export const resolveSource: DirectiveResolver = (arg, ctx, attributes = {}) => {
  if (arg === null) return { error: '::source needs an item name, e.g. ::source[Annihilus]' };
  const unknown = Object.keys(attributes).filter((key) => key !== 'item');
  if (unknown.length > 0) return { error: `::source[${arg}]: unknown attribute ${unknown.join(', ')} (only {item=unique|set|misc})` };
  const kind = attributes.item;
  if (kind !== undefined && !ITEM_KINDS.some((candidate) => candidate === kind)) {
    return { error: `::source[${arg}]: item must be one of ${ITEM_KINDS.join(' | ')} (got "${kind}")` };
  }

  const normalised = normaliseItemName(arg);
  const exact = ctx.sources.items.filter((candidate) => candidate.name === arg);
  const named = exact.length > 0 ? exact : ctx.sources.items.filter((candidate) => normaliseItemName(candidate.name) === normalised);
  const matches = kind === undefined ? named : named.filter((candidate) => candidate.item === kind);
  const item = matches.at(0);
  if (item === undefined) {
    const suffix = kind === undefined ? '' : ` and item=${kind}`;
    return { error: `::source[${arg}]: no item with that name${suffix} in sources.json` };
  }
  if (matches.length > 1) {
    const kinds = [...new Set(matches.map((candidate) => candidate.item))].join(', ');
    return {
      error: `::source[${arg}]: ambiguous (${String(matches.length)} items: ${kinds}); add {item=…}, e.g. ::source[${arg}]{item=${item.item}}`,
    };
  }
  return { kind: 'source', item: item.name, labels: item.labels };
};
