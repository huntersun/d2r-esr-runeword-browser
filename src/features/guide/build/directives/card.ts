/**
 * `::card[rw:Enigma]`, `::card[gw:Name]`, `::card[unique:Name]`, `::card[mythical:Name]`, `::card[socketable:Name]`:
 * an embedded item card. The browser resolves the card from the HTM data by `name`, so the name is kept exactly as
 * written; it is validated like the link of the same scheme (links.ts), whose app link becomes the card's `href`.
 */
import type { DataBlock } from '../../engine/schema.ts';
import { resolveLink } from '../links.ts';
import type { DirectiveResolver } from './types.ts';

type CardItem = Extract<DataBlock, { kind: 'card' }>['item'];

const CARD_SCHEMES: Readonly<Record<string, CardItem>> = {
  rw: 'runeword',
  gw: 'gemword',
  unique: 'unique',
  mythical: 'mythical',
  socketable: 'socketable',
};

const USAGE = `use ::card[${Object.keys(CARD_SCHEMES).join('|')}:Name], e.g. ::card[rw:Enigma]`;

/** `scheme:name` with the spaces around the colon dropped and runs of spaces collapsed (the block key) */
export function cardKeyArg(arg: string): string {
  const colon = arg.indexOf(':');
  const tidy = (text: string) => text.trim().replace(/\s+/g, ' ');
  return colon === -1 ? tidy(arg) : `${tidy(arg.slice(0, colon))}:${tidy(arg.slice(colon + 1))}`;
}

export const resolveCard: DirectiveResolver = (arg, ctx, attributes = {}) => {
  if (arg === null) return { error: `::card needs an item (${USAGE})` };
  const colon = arg.indexOf(':');
  const scheme = colon === -1 ? '' : arg.slice(0, colon).trim();
  const name = colon === -1 ? '' : arg.slice(colon + 1).trim();
  const item = Object.hasOwn(CARD_SCHEMES, scheme) ? CARD_SCHEMES[scheme] : undefined;
  if (item === undefined || name === '') return { error: `::card[${arg}]: ${USAGE}` };
  if (Object.keys(attributes).length > 0) return { error: `::card[${arg}] takes no attributes` };
  // Encoded so the link resolver's percent-decoding hands the name back unchanged.
  const link = resolveLink(`${scheme}:${encodeURIComponent(name)}`, ctx);
  if ('error' in link) return { error: `::card[${arg}]: ${link.error}` };
  return { kind: 'card', item, name, href: link.href };
};
