import { useEffect, useState } from 'react';
import type { GameDataManifest } from '../engine/schema';
import { loadManifest } from '../engine/browser/loadGameData';

/** The game-data manifest, or null while loading / on error (pages show their own error card for bundle failures). */
export function useManifest(): GameDataManifest | null {
  const [manifest, setManifest] = useState<GameDataManifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadManifest().then(
      (loaded) => {
        if (!cancelled) setManifest(loaded);
      },
      (error: unknown) => {
        console.error('Failed to load game data manifest:', error);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return manifest;
}
