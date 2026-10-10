/** `::difficulty-penalties`: resistance penalty, death XP loss and monster skill bonus per difficulty (difficultylevels.txt). */
import { requireEsr, type DirectiveResolver } from './types.ts';

export const resolveDifficultyPenalties: DirectiveResolver = (arg, ctx) => {
  if (arg !== null) return { error: '::difficulty-penalties takes no argument' };
  const esr = requireEsr(ctx, 'difficulty-penalties');
  if ('error' in esr) return esr;
  if (esr.difficulties.length === 0) return { error: '::difficulty-penalties: difficultylevels.txt has no rows' };
  return {
    kind: 'table',
    caption: 'Penalties per difficulty',
    header: ['Difficulty', 'Resistance penalty', 'Experience lost on death', 'Monster skill bonus'],
    rows: esr.difficulties.map((row) => [
      row.name,
      String(row.resistPenalty),
      `${String(row.deathExpPenalty)}%`,
      `+${String(row.monsterSkillBonus)}`,
    ]),
  };
};
