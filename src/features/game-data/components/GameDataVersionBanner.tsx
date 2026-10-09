import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { useManifest } from '../hooks/useManifest';

/**
 * "Game files: ESR …" line plus an amber note when the HTM docs data (Dexie metadata) has a different ESR version.
 * The two version schemes do not compare numerically, so the note never claims which one is newer.
 */
export function GameDataVersionBanner() {
  const manifest = useManifest();
  const docsVersion = useLiveQuery(async () => (await db.metadata.get('esrVersion'))?.value);

  if (manifest === null) return null;

  const commit = manifest.esrCommit.slice(0, 7);
  const tag = manifest.esrTag ?? 'untagged';
  const generated = manifest.generatedAt.slice(0, 10);
  const versionsDiffer = docsVersion !== undefined && docsVersion !== manifest.esrVersion;

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>
        Game files: ESR {manifest.esrVersion} (tag {tag} @ {commit}, generated {generated})
      </p>
      {versionsDiffer && (
        <p className="text-amber-700 dark:text-amber-400">
          Docs data is ESR {docsVersion}; game-file data is ESR {manifest.esrVersion} — some details may differ.
        </p>
      )}
    </div>
  );
}
