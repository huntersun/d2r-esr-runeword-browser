import { parseJsonc } from '../engine/jsonc';
import { isPlainObject } from '../engine/parse';

export interface EntrySummary {
  /** False when the text is not valid JSON. */
  readonly readable: boolean;
  readonly title: string | null;
  readonly author: string | null;
  readonly ruleCount: number;
}

const UNREADABLE: EntrySummary = { readable: false, title: null, author: null, ruleCount: 0 };

// Library cards re-render often; the texts rarely change. Keyed by the text itself, cleared when it grows large.
const cache = new Map<string, EntrySummary>();
const CACHE_LIMIT = 50;

function compute(text: string): EntrySummary {
  try {
    const { value } = parseJsonc(text);
    if (!isPlainObject(value)) return { ...UNREADABLE, readable: true };
    return {
      readable: true,
      title: typeof value.title === 'string' && value.title !== '' ? value.title : null,
      author: typeof value.author === 'string' && value.author !== '' ? value.author : null,
      ruleCount: Array.isArray(value.rules) ? value.rules.length : 0,
    };
  } catch {
    return UNREADABLE;
  }
}

/** Title, author and rule count from a filter file's text (a JSON read, not a full parse). */
export function summarizeEntry(text: string): EntrySummary {
  const hit = cache.get(text);
  if (hit) return hit;
  if (cache.size >= CACHE_LIMIT) cache.clear();
  const summary = compute(text);
  cache.set(text, summary);
  return summary;
}
