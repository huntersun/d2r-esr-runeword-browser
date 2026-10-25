import { useDocsDataLine } from '@/core/hooks/useDocsDataLine';
import { useManifest } from '../hooks/useManifest';

/**
 * "Game files: ESR …" and "Docs data: ESR … (site updated …)" lines, plus an amber note when the
 * HTM docs data (Dexie metadata) has a different ESR version. Both normally come from the same field
 * (`metadata.modVersion` in d2rloader/metadata.json: the clone's copy for game files, the live GitHub copy
 * for docs), so they compare like with like. The docs side can fall back to the changelog page's header,
 * so the note still never claims which one is newer.
 */
export function GameDataVersionBanner() {
  const manifest = useManifest();
  const docs = useDocsDataLine();

  if (manifest === null) return null;

  const commit = manifest.esrCommit.slice(0, 7);
  const tag = manifest.esrTag ?? 'untagged';
  const generated = manifest.generatedAt.slice(0, 10);
  const versionsDiffer = docs.version !== undefined && docs.version !== manifest.esrVersion;

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>
        Game files: ESR {manifest.esrVersion} (tag {tag} @ {commit}, generated {generated})
      </p>
      {docs.line !== null && <p>{docs.line}</p>}
      {versionsDiffer && (
        <p className="text-amber-700 dark:text-amber-400">
          Docs data is ESR {docs.version}; game-file data is ESR {manifest.esrVersion} — some details may differ.
        </p>
      )}
    </div>
  );
}
