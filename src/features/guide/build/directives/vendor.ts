/** `::vendor[Gheed]`: the items an NPC sells (the `<Npc>Min/Max` and `<Npc>MagicMin/Max` columns of misc/armor/weapons). */
import type { ItemsBlockItem } from '../../engine/schema.ts';
import { requireEsr, type DirectiveResolver } from './types.ts';

export const resolveVendor: DirectiveResolver = (arg, ctx) => {
  const esr = requireEsr(ctx, 'vendor');
  if ('error' in esr) return esr;
  const npc = esr.npcs.find((name) => name.toLowerCase() === (arg ?? '').toLowerCase());
  if (npc === undefined) return { error: `::vendor[${arg ?? ''}]: unknown NPC (known: ${esr.npcs.join(', ')})` };
  const items = new Map<string, ItemsBlockItem>();
  for (const item of esr.items) {
    const offer = item.vendors.find((vendor) => vendor.npc === npc);
    if (offer === undefined || items.has(item.name)) continue;
    items.set(item.name, { label: item.name, detail: offer.magicOnly ? 'magic only' : null });
  }
  if (items.size === 0) return { error: `::vendor[${npc}]: that NPC sells nothing according to the txt files` };
  return { kind: 'items', caption: `Sold by ${npc}`, items: [...items.values()] };
};
