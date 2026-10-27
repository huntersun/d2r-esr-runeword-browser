import type { SkillDetailsBundle, SkillsBundle } from '@/features/game-data/engine/schema';
import { useGameData } from '@/features/game-data/hooks/useGameData';
import { buildSkillsView, type SkillsView } from '@/features/skills/utils/skills';

/**
 * The skill data of a builds screen: `bundle` (skills.json: trees, level cap, names) and `view` (joined with
 * skilldetails.json for the icon tiles and the detail card). `idle` when not needed, `error` when a file failed to load.
 */
export type SkillTreeState =
  | { readonly status: 'idle' | 'loading' | 'error'; readonly bundle: undefined; readonly view: undefined }
  | { readonly status: 'ready'; readonly bundle: SkillsBundle; readonly view: SkillsView };

const SKILL_FILES = ['skills', 'skilldetails'] as const;
type SkillFile = (typeof SKILL_FILES)[number];
const NO_FILES: readonly SkillFile[] = [];

/** Loads skills.json + skilldetails.json once per screen; `enabled: false` skips the fetch (no class chosen, nothing to show). */
export function useSkillTree(enabled: boolean): SkillTreeState {
  const game = useGameData<SkillFile>(enabled ? SKILL_FILES : NO_FILES);
  if (!enabled) return { status: 'idle', bundle: undefined, view: undefined };
  if (game.status !== 'ready') return { status: game.status, bundle: undefined, view: undefined };
  // The state can briefly hold the result of the previous (empty) file list after `enabled` flips on.
  const bundle = game.data.skills as SkillsBundle | undefined;
  const details = game.data.skilldetails as SkillDetailsBundle | undefined;
  if (bundle === undefined || details === undefined) return { status: 'loading', bundle: undefined, view: undefined };
  return { status: 'ready', bundle, view: buildSkillsView(bundle, details) };
}
