import { describe, it, expect } from 'vitest';
import { buildSourceIndex, findItemSource } from './sourceLookup';
import type { ItemSource, SourcesBundle } from './schema';

function entry(name: string, item: ItemSource['item'], text: string, code = 'xyz'): ItemSource {
  return { name, code, item, labels: [{ kind: 'drop', text }] };
}

const bundle: SourcesBundle = {
  items: [
    entry('Worldstone Shard', 'set', 'set-shard'),
    entry('Worldstone Shard', 'misc', 'misc-shard'),
    entry('Ore', 'unique', 'unique-ore'),
    entry('Ore', 'misc', 'misc-ore'),
    entry("El'Druin, Excalibur of the Light", 'unique', 'eldruin'),
    entry('The Ties That Bind', 'unique', 'ties'),
    { name: 'Character Augmenter', code: 'aug', item: 'misc', labels: [{ kind: 'unknown', text: 'Unknown' }] },
  ],
};

describe('buildSourceIndex', () => {
  it('groups entries of the same normalised name across kinds', () => {
    const index = buildSourceIndex(bundle);
    expect(index.get('worldstone shard')?.map((e) => e.item)).toEqual(['set', 'misc']);
    expect(index.get('ore')?.map((e) => e.item)).toEqual(['unique', 'misc']);
    expect(index.size).toBe(5);
  });
});

describe('findItemSource', () => {
  const index = buildSourceIndex(bundle);

  it('prefers the requested kind on name collisions', () => {
    expect(findItemSource(index, 'Worldstone Shard', 'misc')?.labels[0]?.text).toBe('misc-shard');
    expect(findItemSource(index, 'Worldstone Shard', 'set')?.labels[0]?.text).toBe('set-shard');
    expect(findItemSource(index, 'Ore', 'unique')?.labels[0]?.text).toBe('unique-ore');
    expect(findItemSource(index, 'Ore', 'misc')?.labels[0]?.text).toBe('misc-ore');
  });

  it('falls back to the first entry without a kind or when the kind is missing', () => {
    expect(findItemSource(index, 'Ore')?.item).toBe('unique');
    expect(findItemSource(index, 'Worldstone Shard', 'unique')?.item).toBe('set');
  });

  it('matches names that differ in casing, apostrophes and whitespace', () => {
    expect(findItemSource(index, 'El’Druin, Excalibur of the Light ', 'unique')?.code).toBe('xyz');
    expect(findItemSource(index, 'The Ties that Bind', 'unique')?.labels[0]?.text).toBe('ties');
  });

  it('returns Unknown entries as they are and null for missing names', () => {
    expect(findItemSource(index, 'Character Augmenter', 'misc')?.labels).toEqual([{ kind: 'unknown', text: 'Unknown' }]);
    expect(findItemSource(index, 'No Such Item')).toBeNull();
  });
});
