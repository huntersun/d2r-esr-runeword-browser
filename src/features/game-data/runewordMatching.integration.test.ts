/**
 * Matches the live runewords.htm fixture (parsed with the app's own parser) against the committed runewords.json.
 * Skipped when either input is missing (run `npm run test:fixtures` / `npm run game-data:generate`).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { parseGemwordsHtml } from '@/features/data-sync/parsers/gemwordsParser';
import { parseRunewordsHtml } from '@/features/data-sync/parsers/runewordsParser';
import { matchRunewords, htmRunewordId, rowsForSockets } from './engine/matchRunewords.ts';
import type { TxtRunewordsBundle, TypesBundle } from './engine/schema.ts';

const FIXTURE = resolve(__dirname, '../../../test-fixtures/runewords.htm');
const GEMWORDS_FIXTURE = resolve(__dirname, '../../../test-fixtures/gemwords.htm');
const BUNDLE = resolve(__dirname, '../../../public/game-data/runewords.json');
const TYPES = resolve(__dirname, '../../../public/game-data/types.json');

describe.skipIf(!existsSync(FIXTURE) || !existsSync(BUNDLE) || !existsSync(TYPES))(
  'runeword matching (runewords.htm ↔ runewords.json)',
  () => {
    const htm = parseRunewordsHtml(readFileSync(FIXTURE, 'utf-8'));
    const txt = JSON.parse(readFileSync(BUNDLE, 'utf-8')) as TxtRunewordsBundle;
    const { types } = JSON.parse(readFileSync(TYPES, 'utf-8')) as TypesBundle;
    const result = matchRunewords(htm, txt, { typeNames: new Map(types.map((type) => [type.code, type.name])) });

    it('matches at least 95 % of the HTM runewords', () => {
      const histogram: Record<string, number> = {};
      for (const match of result.byHtm.values()) histogram[match.quality] = (histogram[match.quality] ?? 0) + 1;
      const ratio = result.byHtm.size / htm.length;
      console.log(`Runeword matching: ${String(result.byHtm.size)}/${String(htm.length)} HTM rows matched (${(ratio * 100).toFixed(1)} %)`);
      console.log(`Quality histogram: ${JSON.stringify(histogram)}`);
      const tied = new Set(
        [...result.byHtm.values()].filter((match) => match.keys.length > 1).map((match) => `${match.name} (${match.keys.join('/')})`)
      );
      console.log(`Matches still carrying several txt keys after the allowed-items tie-break: ${[...tied].join(', ')}`);
      console.log(
        `Unmatched HTM (${String(result.unmatchedHtm.length)}): ${result.unmatchedHtm
          .map((rw) => `${htmRunewordId(rw)} [${rw.ingredients.join(', ')}]`)
          .join('; ')}`
      );
      console.log(
        `Unmatched txt (${String(result.unmatchedTxt.length)}): ${result.unmatchedTxt
          .map((rw) => `${rw.key} ${rw.name} [${(rw.rows[0]?.ingredients ?? []).join(', ')}]`)
          .join('; ')}`
      );
      expect(ratio).toBeGreaterThanOrEqual(0.95);
      // Same name + recipe split over several txt keys by item type (Rain, Shinigami, …) is resolved via allowed items
      expect([...tied]).toEqual([]);
    });

    it('finds a txt row for the socket count of every exactly matched HTM row', () => {
      const missing = htm.filter((rw) => {
        const match = result.byHtm.get(htmRunewordId(rw));
        return match?.quality === 'exact' && rowsForSockets(match.rows, rw).length === 0;
      });
      if (missing.length > 0)
        console.log(
          `No txt row for the HTM socket count: ${missing.map((rw) => `${htmRunewordId(rw)} (${String(rw.sockets)})`).join(', ')}`
        );
      expect(missing).toEqual([]);
    });

    // The txt keys left over are the gem-only recipes; the site lists those on gemwords.htm
    it.skipIf(!existsSync(GEMWORDS_FIXTURE))('matches the remaining txt keys to gemwords.htm', () => {
      const gemwords = parseGemwordsHtml(readFileSync(GEMWORDS_FIXTURE, 'utf-8'));
      const leftover = matchRunewords(gemwords, { runewords: result.unmatchedTxt });
      console.log(
        `Gemword matching: ${String(result.unmatchedTxt.length - leftover.unmatchedTxt.length)}/${String(result.unmatchedTxt.length)} leftover txt keys found on gemwords.htm`
      );
      expect(leftover.unmatchedTxt.map((rw) => `${rw.key} ${rw.name}`)).toEqual([]);
    });
  }
);
