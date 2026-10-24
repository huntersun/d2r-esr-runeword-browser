import type { BaseAutomod, BaseItem } from '../engine/schema';

export interface AutomodOption {
  automod: BaseAutomod;
  /** The option's own lines (without the shared ones) */
  lines: string[];
}

export interface BaseAutomodView {
  /** Lines every option has (e.g. ESR's "Tinkering Points"); empty for a single option */
  shared: string[];
  options: AutomodOption[];
}

/**
 * The automods a base can roll, ready for the card: one of `options` is picked per item (by item level and
 * frequency), so lines common to every option are pulled out into `shared`. null when the base has none.
 */
export function baseAutomodView(base: Pick<BaseItem, 'automods'>, automodById: ReadonlyMap<number, BaseAutomod>): BaseAutomodView | null {
  const automods = (base.automods ?? []).flatMap((id) => {
    const automod = automodById.get(id);
    return automod === undefined ? [] : [automod];
  });
  if (automods.length === 0) return null;
  const [first, ...rest] = automods;
  if (rest.length === 0) return { shared: [], options: [{ automod: first, lines: first.text }] };

  const shared = first.text.filter((line) => rest.every((automod) => automod.text.includes(line)));
  return {
    shared,
    options: automods.map((automod) => ({ automod, lines: automod.text.filter((line) => !shared.includes(line)) })),
  };
}

/** Card label for the base's `mindam`/`maxdam`: weapons hit with it, shields smite, boots kick. */
export function baseDamageLabel(base: Pick<BaseItem, 'kind' | 'ancestors'>): '1H' | 'Smite' | 'Kick' {
  if (base.kind !== 'armor') return '1H';
  return base.ancestors.includes('boot') ? 'Kick' : 'Smite';
}
