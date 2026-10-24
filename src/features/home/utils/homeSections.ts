/**
 * The home page's section cards, derived from the header's NAV_ENTRIES so the two never drift: a nav group becomes a
 * card of its pages, a plain nav link a card of its own (with its `homeLinks` chips when it has them).
 */
import { getNavEntries, type HomeLink, type NavEntry } from '@/core/navigation/navConfig';

export interface HomeSection {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly links: readonly HomeLink[];
}

export function homeSectionsFromEntries(entries: readonly NavEntry[]): HomeSection[] {
  return entries.map((entry): HomeSection => {
    if (entry.kind === 'group') {
      return {
        key: entry.key,
        title: entry.label,
        description: entry.description,
        links: entry.items.map(({ key, to, label }) => ({ key, to, label })),
      };
    }
    const { key, to, label, description } = entry.item;
    return { key, title: label, description, links: entry.homeLinks ?? [{ key, to, label }] };
  });
}

/** The cards to show: Builds only when the Supabase backend is configured (like the header). */
export function getHomeSections(isSupabaseEnabled: boolean): HomeSection[] {
  return homeSectionsFromEntries(getNavEntries(isSupabaseEnabled));
}
