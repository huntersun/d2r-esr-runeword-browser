/**
 * The committed public/guide/ files must be what `npm run guide:generate` produces from content/guide/, the ESR clone
 * and the committed game data. Skipped (with the reason logged) when any of those inputs is missing.
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { GUIDE_SCHEMA, type GuideManifest } from './engine/schema.ts';
import { generateGuide } from './build/generateGuide.ts';
import { countNoteFiles, readEsrForGuide, readGameDataInputs, readGuideContent } from './build/readGuideInputs.ts';
import { serializeBundle } from './build/writeGuide.ts';

const ROOT = resolve(__dirname, '../../..');
const CONTENT_DIR = resolve(ROOT, 'content/guide');
const OUTPUT_DIR = resolve(ROOT, 'public/guide');
const GAME_DATA_DIR = resolve(ROOT, 'public/game-data');
const SOURCES_FILE = resolve(GAME_DATA_DIR, 'sources.json');
const ESR_DIR = resolve(ROOT, process.env.ESR_SOURCE_DIR ?? '../Eastern_Sun_Resurrected');

function skipReason(): string | null {
  if (countNoteFiles(CONTENT_DIR) === 0) return 'content/guide has no notes yet';
  if (!existsSync(resolve(OUTPUT_DIR, 'manifest.json'))) return 'public/guide/manifest.json is missing (run npm run guide:generate)';
  if (!existsSync(SOURCES_FILE)) return 'public/game-data/sources.json is missing';
  if (!existsSync(ESR_DIR)) return `ESR clone not found at ${ESR_DIR}`;
  return null;
}

const reason = skipReason();
if (reason !== null) console.log(`Guide integrity test skipped: ${reason}`);

describe.skipIf(reason !== null)('committed guide bundle', () => {
  it('matches the manifest and is what the generator produces (run npm run guide:generate if this fails)', () => {
    const manifest = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'manifest.json'), 'utf-8')) as GuideManifest;
    const guideText = readFileSync(resolve(OUTPUT_DIR, 'guide.json'), 'utf-8');
    expect(manifest.schema).toBe(GUIDE_SCHEMA);
    expect(manifest.files.guide?.hash).toBe(createHash('sha256').update(guideText, 'utf8').digest('hex'));
    expect(manifest.files.guide?.bytes).toBe(Buffer.byteLength(guideText, 'utf8'));

    const esr = readEsrForGuide(ESR_DIR);
    const generated = generateGuide({
      content: readGuideContent(CONTENT_DIR),
      gameData: readGameDataInputs(GAME_DATA_DIR, SOURCES_FILE),
      esr: esr?.tables ?? null,
      docs: esr?.docs ?? null,
    });
    expect(generated.errors).toEqual([]);
    expect(serializeBundle(generated.bundle)).toBe(guideText);
    expect(generated.counts).toEqual(manifest.counts);
    expect(generated.warnings).toEqual(manifest.warnings);
    expect(esr?.esrVersion).toBe(manifest.esrVersion);
  });
});
