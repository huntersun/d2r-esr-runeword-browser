/** Manifest for public/guide/ (same pattern as game-data's buildManifest, with the guide schema). */
import { Buffer } from 'node:buffer';
import { sha256 } from '../../game-data/build/writeBundle.ts';
import { GUIDE_SCHEMA, type GuideFile, type GuideManifest } from '../engine/schema.ts';

export { serializeBundle } from '../../game-data/build/writeBundle.ts';

export interface GuideManifestInput {
  esrVersion: string;
  esrTag: string | null;
  esrCommit: string;
  /** Serialized bundle files */
  files: Record<GuideFile, string>;
  counts: Record<string, number>;
  warnings: string[];
  /** Manifest currently on disk, if any; its generatedAt is kept when no content hash changed */
  previous: GuideManifest | null;
  now: Date;
}

export function buildGuideManifest(input: GuideManifestInput): GuideManifest {
  const files: GuideManifest['files'] = {};
  for (const [name, text] of Object.entries(input.files) as [GuideFile, string][]) {
    files[name] = { hash: sha256(text), bytes: Buffer.byteLength(text, 'utf8') };
  }
  const previous = input.previous;
  const unchanged =
    previous !== null &&
    previous.schema === GUIDE_SCHEMA &&
    Object.keys(files).length === Object.keys(previous.files).length &&
    (Object.entries(files) as [GuideFile, { hash: string }][]).every(([name, { hash }]) => previous.files[name]?.hash === hash);

  return {
    schema: GUIDE_SCHEMA,
    esrVersion: input.esrVersion,
    esrTag: input.esrTag,
    esrCommit: input.esrCommit,
    generatedAt: unchanged ? previous.generatedAt : input.now.toISOString(),
    files,
    counts: input.counts,
    warnings: input.warnings,
  };
}
