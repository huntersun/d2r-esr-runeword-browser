/** `::recipe-output[Adventurer's Pack]`: the outputs of the cubemain rows whose description equals the argument. */
import type { DataBlock } from '../../engine/schema.ts';
import { describeOutput } from './cubeText.ts';
import { requireEsr, type DirectiveResolver } from './types.ts';

type Item = Extract<DataBlock, { kind: 'items' }>['items'][number];

export const resolveRecipeOutput: DirectiveResolver = (arg, ctx) => {
  if (arg === null) return { error: "::recipe-output needs a cube recipe description, e.g. ::recipe-output[Adventurer's Pack]" };
  const esr = requireEsr(ctx, 'recipe-output');
  if ('error' in esr) return esr;
  const rows = esr.cube.filter((row) => row.description === arg);
  if (rows.length === 0) return { error: `::recipe-output[${arg}]: no enabled cubemain row has that description` };
  const items = new Map<string, Item>();
  for (const output of rows.flatMap((row) => row.outputs)) {
    const { name, details } = describeOutput(output, esr);
    const item = { label: name, detail: details.length === 0 ? null : details.join(', ') };
    items.set(JSON.stringify(item), item);
  }
  return { kind: 'items', caption: `${arg} contains`, items: [...items.values()] };
};
