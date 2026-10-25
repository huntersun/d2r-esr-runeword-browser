import type { SkillsBundle } from '@/features/game-data/engine/schema';
import { useGameData } from '@/features/game-data/hooks/useGameData';

/** The skills.json bundle for a screen: `idle` when not needed, `error` when it failed to load. */
export type SkillTreeState =
  | { readonly status: 'idle' | 'loading' | 'error'; readonly bundle: undefined }
  | { readonly status: 'ready'; readonly bundle: SkillsBundle };

const SKILL_FILES = ['skills'] as const;
const NO_FILES: readonly 'skills'[] = [];

/** Loads skills.json once per screen; `enabled: false` skips the fetch (no class chosen, nothing to show). */
export function useSkillTree(enabled: boolean): SkillTreeState {
  const game = useGameData<'skills'>(enabled ? SKILL_FILES : NO_FILES);
  if (!enabled) return { status: 'idle', bundle: undefined };
  if (game.status !== 'ready') return { status: game.status, bundle: undefined };
  // The state can briefly hold the result of the previous (empty) file list after `enabled` flips on.
  const bundle = game.data.skills as SkillsBundle | undefined;
  if (bundle === undefined) return { status: 'loading', bundle: undefined };
  return { status: 'ready', bundle };
}
