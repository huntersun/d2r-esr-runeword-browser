/**
 * Which notes show which cube family and which misc item, from the resolved data blocks: `familyNotes` (family id →
 * slugs) and `itemNotes` (misc item code → slugs). The Materials page joins them in the browser; the game-data build
 * cannot read them (the guide build reads the game data, so the other direction would be a cycle).
 *
 * - `::recipes[id]` → that family; `::secret-recipes` / `::secret-recipe[N]` → `secret`.
 * - `::recipe-output[description]` → the families of its cubemain rows and the misc items its rows take.
 * - `::source[Name]` of a misc item and `::card[socketable:Name]` → every misc code with that display name.
 */
import { normaliseItemName } from '../../../core/utils/itemName.ts';
import { assignCubeRows } from '../../game-data/build/bundleCube.ts';
import { parseCubeCell } from '../../game-data/build/cube/cubeText.ts';
import { compareCodeUnits } from './compare.ts';
import type { GuideContext } from './context.ts';
import type { NoteDataBlock } from './markdown.ts';

export interface NoteIndex {
  familyNotes: Record<string, string[]>;
  itemNotes: Record<string, string[]>;
}

const SECRET_FAMILY = 'secret';

function add(index: Map<string, Set<string>>, key: string, slug: string): void {
  const slugs = index.get(key) ?? new Set<string>();
  slugs.add(slug);
  index.set(key, slugs);
}

function toRecord(index: ReadonlyMap<string, ReadonlySet<string>>): Record<string, string[]> {
  return Object.fromEntries(
    [...index].sort(([a], [b]) => compareCodeUnits(a, b)).map(([key, slugs]) => [key, [...slugs].sort(compareCodeUnits)])
  );
}

export function buildNoteIndex(notes: readonly { slug: string; dataBlocks: readonly NoteDataBlock[] }[], ctx: GuideContext): NoteIndex {
  const esr = ctx.esr;
  const miscCodes = new Map<string, Set<string>>();
  const addName = (name: string, code: string) => {
    const key = normaliseItemName(name);
    miscCodes.set(key, (miscCodes.get(key) ?? new Set<string>()).add(code));
  };
  for (const source of ctx.sources.items) if (source.item === 'misc') addName(source.name, source.code);
  for (const item of esr?.items ?? []) {
    if (item.kind !== 'misc' || item.code === '') continue;
    addName(item.name, item.code);
    addName(esr?.nameOf(item.code) ?? item.name, item.code);
  }
  const isMisc = new Set(esr?.items.filter((item) => item.kind === 'misc').map((item) => item.code) ?? []);
  const familyOfLine = new Map<number, string>();
  if (esr !== null) {
    for (const [id, { rows }] of assignCubeRows(esr).assigned) for (const row of rows) familyOfLine.set(row.line, id);
  }

  const families = new Map<string, Set<string>>();
  const items = new Map<string, Set<string>>();
  const addItems = (name: string, slug: string) => {
    for (const code of miscCodes.get(normaliseItemName(name)) ?? []) add(items, code, slug);
  };
  for (const { slug, dataBlocks } of notes) {
    for (const { key, directive, arg, block } of dataBlocks) {
      const sourceKind = /\{item=(\w+)\}/.exec(key)?.[1] ?? 'misc';
      if (directive === 'recipes' && arg !== null) add(families, arg, slug);
      else if (directive === 'secret-recipes' || directive === 'secret-recipe') add(families, SECRET_FAMILY, slug);
      else if (directive === 'recipe-output' && esr !== null) {
        for (const row of esr.cube.filter((cubeRow) => cubeRow.description === arg)) {
          const family = familyOfLine.get(row.line);
          if (family !== undefined) add(families, family, slug);
          for (const spec of row.inputs) {
            const { token } = parseCubeCell(spec);
            if (isMisc.has(token)) add(items, token, slug);
          }
        }
      } else if (block.kind === 'source') {
        if (sourceKind === 'misc' && ctx.sources.items.some((source) => source.item === 'misc' && source.name === block.item))
          addItems(block.item, slug);
      } else if (block.kind === 'card' && block.item === 'socketable') addItems(block.name, slug);
    }
  }
  return { familyNotes: toRecord(families), itemNotes: toRecord(items) };
}
