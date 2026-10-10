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

const MANIFEST_FILE = resolve(OUTPUT_DIR, 'manifest.json');
const committed = existsSync(MANIFEST_FILE);
if (!committed) console.log('Guide integrity test skipped: public/guide/manifest.json is missing (run npm run guide:generate)');

function regenerationSkipReason(): string | null {
  if (!committed) return 'public/guide/manifest.json is missing';
  if (countNoteFiles(CONTENT_DIR) === 0) return 'content/guide has no notes yet';
  if (!existsSync(SOURCES_FILE)) return 'public/game-data/sources.json is missing';
  if (!existsSync(ESR_DIR)) return `ESR clone not found at ${ESR_DIR}`;
  return null;
}

const reason = regenerationSkipReason();
if (committed && reason !== null) console.log(`Guide regeneration check skipped: ${reason}`);

function readCommitted(): { manifest: GuideManifest; guideText: string } {
  return {
    manifest: JSON.parse(readFileSync(MANIFEST_FILE, 'utf-8')) as GuideManifest,
    guideText: readFileSync(resolve(OUTPUT_DIR, 'guide.json'), 'utf-8'),
  };
}

describe.skipIf(!committed)('committed guide bundle', () => {
  it('matches the app schema and the manifest hash and size', () => {
    const { manifest, guideText } = readCommitted();
    expect(manifest.schema).toBe(GUIDE_SCHEMA);
    expect(manifest.files.guide?.hash).toBe(createHash('sha256').update(guideText, 'utf8').digest('hex'));
    expect(manifest.files.guide?.bytes).toBe(Buffer.byteLength(guideText, 'utf8'));
  });
});

describe.skipIf(reason !== null)('guide bundle generated from content/guide', () => {
  it('produces the committed files (run npm run guide:generate if this fails)', () => {
    const { manifest, guideText } = readCommitted();
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
