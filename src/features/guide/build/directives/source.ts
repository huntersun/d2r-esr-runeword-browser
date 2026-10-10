/** `::source[Annihilus]`: the "where it comes from" labels of an item from public/game-data/sources.json. */
import type { DirectiveResolver } from './types.ts';

export const resolveSource: DirectiveResolver = (arg, ctx) => {
  if (arg === null) return { error: '::source needs an item name, e.g. ::source[Annihilus]' };
  const lower = arg.toLowerCase();
  const item =
    ctx.sources.items.find((candidate) => candidate.name === arg) ??
    ctx.sources.items.find((candidate) => candidate.name.toLowerCase() === lower);
  if (item === undefined) return { error: `::source[${arg}]: no item with that name in sources.json` };
  return { kind: 'source', item: item.name, labels: item.labels };
};
