/**
 * Stat renderer oracle: the runeword stats rendered from runes.txt (`runewords.json` row `text`) against the bonus
 * lines of the ESR docs page (runewords.htm, parsed with the app's own parser; gem-only recipes via gemwords.htm).
 * Rune bonuses are not part of the parsed HTM affixes, so both sides list the runeword's own stats.
 * Skipped when a fixture or bundle is missing (run `npm run test:fixtures` / `npm run game-data:generate`).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import type { Affix, SocketableBonuses } from '@/core/db';
import { parseGemwordsHtml } from '@/features/data-sync/parsers/gemwordsParser';
import { parseRunewordsHtml } from '@/features/data-sync/parsers/runewordsParser';
import { mergeWrappedLines } from '@/features/data-sync/parsers/shared/parserUtils';
import { matchRunewords, htmRunewordId, rowsForSockets, type HtmRunewordLike } from './engine/matchRunewords.ts';
import type { TxtRunewordsBundle, TypesBundle } from './engine/schema.ts';

const FIXTURE = resolve(__dirname, '../../../test-fixtures/runewords.htm');
const GEMWORDS_FIXTURE = resolve(__dirname, '../../../test-fixtures/gemwords.htm');
const BUNDLE = resolve(__dirname, '../../../public/game-data/runewords.json');
const TYPES = resolve(__dirname, '../../../public/game-data/types.json');

/** Measured 96.5 % on 2026-10-09 (ESR 3.2.10 game files vs the 2026-10 docs fixture), minus 2 points. */
const IDENTICAL_FLOOR = 94.5;

const DASHES = /[‐‑‒–—−]/g;
const APOSTROPHES = /[‘’‛`´′]/g;

export function normalizeLine(line: string): string {
  return line
    .replace(/ÿc./g, '')
    .replace(DASHES, '-')
    .replace(APOSTROPHES, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '');
}

function words(line: string): Set<string> {
  return new Set(line.split(/[^a-z0-9%']+/).filter((word) => word !== ''));
}

function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  const common = [...wa].filter((word) => wb.has(word)).length;
  return common / Math.max(1, new Set([...wa, ...wb]).size);
}

interface HtmRow extends HtmRunewordLike {
  readonly columnAffixes: SocketableBonuses;
}

function htmLines(row: HtmRow): string[] {
  const { weaponsGloves, helmsBoots, armorShieldsBelts } = row.columnAffixes;
  const lines = [weaponsGloves, helmsBoots, armorShieldsBelts].flatMap((column: readonly Affix[]) =>
    column.map((affix) => normalizeLine(affix.rawText))
  );
  return [...new Set(lines)];
}

describe.skipIf(!existsSync(FIXTURE) || !existsSync(BUNDLE) || !existsSync(TYPES))(
  'stat renderer oracle (runes.txt ↔ runewords.htm)',
  () => {
    const txt = JSON.parse(readFileSync(BUNDLE, 'utf-8')) as TxtRunewordsBundle;
    const { types } = JSON.parse(readFileSync(TYPES, 'utf-8')) as TypesBundle;
    const typeNames = new Map(types.map((type) => [type.code, type.name]));
    const runewords: HtmRow[] = parseRunewordsHtml(readFileSync(FIXTURE, 'utf-8'));
    const result = matchRunewords(runewords, txt, { typeNames });
    const pairs: [HtmRow, ReturnType<typeof result.byHtm.get>][] = runewords.map((rw) => [rw, result.byHtm.get(htmRunewordId(rw))]);
    if (existsSync(GEMWORDS_FIXTURE)) {
      const gemwords: HtmRow[] = parseGemwordsHtml(readFileSync(GEMWORDS_FIXTURE, 'utf-8'));
      const gemResult = matchRunewords(gemwords, { runewords: result.unmatchedTxt }, { typeNames });
      for (const gw of gemwords) {
        const match = gemResult.byHtm.get(htmRunewordId(gw));
        if (match !== undefined) pairs.push([gw, match]);
      }
    }

    it('renders the docs page wording for most runeword stat lines', () => {
      let total = 0;
      let identical = 0;
      const mismatches = new Map<string, { count: number; example: string }>();
      for (const [htm, match] of pairs) {
        if (match === undefined) continue;
        const rows = rowsForSockets(match.rows, htm);
        const row = rows[0] ?? match.rows[0];
        if (row === undefined) continue;
        const remaining = htmLines(htm);
        const unmatched: string[] = [];
        // The docs parser re-joins hard-wrapped lines; apply the same heuristic to the multi-line game strings
        for (const line of mergeWrappedLines(row.text).map(normalizeLine)) {
          total++;
          const i = remaining.indexOf(line);
          if (i === -1) {
            unmatched.push(line);
          } else {
            identical++;
            remaining.splice(i, 1);
          }
        }
        for (const line of unmatched) {
          let best = '(none)';
          let bestScore = 0.25;
          for (const candidate of remaining) {
            const score = similarity(line, candidate);
            if (score > bestScore) {
              best = candidate;
              bestScore = score;
            }
          }
          const key = `${line.replace(/\d+(\.\d+)?/g, '#')}  →  ${best.replace(/\d+(\.\d+)?/g, '#')}`;
          const entry = mismatches.get(key) ?? { count: 0, example: htm.name };
          mismatches.set(key, { ...entry, count: entry.count + 1 });
        }
      }
      const ratio = identical / Math.max(1, total);
      console.log(
        `Stat renderer oracle: ${String(identical)}/${String(total)} rendered runeword lines identical (${(ratio * 100).toFixed(1)} %)`
      );
      const top = [...mismatches.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 40);
      console.log(
        `Top mismatches (txt → closest htm):\n${top.map(([key, { count, example }]) => `  ${String(count)}× ${key}   (e.g. ${example})`).join('\n')}`
      );
      expect(ratio * 100).toBeGreaterThanOrEqual(IDENTICAL_FLOOR);
    });
  }
);
