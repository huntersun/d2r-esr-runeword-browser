import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetsBundle } from '@/features/game-data/engine/schema';
import type { BuildData, ItemRef, SetItemRef } from '../buildData';
import { itemRefName, setItemToRef } from './buildSnapshot';
import { computeBuildItemDiffs, diffRef, refSnapshotsEqual, resolveCurrentRef } from './itemDiff';
import { refreshBuildData } from './refreshBuildData';
import { itemRefKey, resolveFullItem } from './resolveItem';

const { loadGameDataFile } = vi.hoisted(() => ({ loadGameDataFile: vi.fn() }));
vi.mock('@/features/game-data/engine/browser/loadGameData', () => ({ loadGameDataFile }));

const BUNDLE: SetsBundle = {
  sets: [
    {
      id: 'Tara',
      name: "Tara's Calling",
      classCode: null,
      className: null,
      reqLevel: { min: 20, max: 30 },
      items: [
        {
          name: "Tara's Helm",
          code: 'cap',
          baseName: 'Cap',
          category: 'Helm',
          level: 25,
          reqLevel: 20,
          lines: ['+20 Defense', '+10 to Strength'],
          partial: [{ pieces: 2, lines: ['+5% Faster Run/Walk'] }],
        },
        {
          name: "Tara's Gloves",
          code: 'lgl',
          baseName: 'Leather Gloves',
          category: 'Gloves',
          level: 25,
          reqLevel: 30,
          lines: ['+10 Defense'],
          partial: [],
        },
      ],
      partial: [{ pieces: 2, lines: ['+50 to Life'] }],
      full: ['+1 to All Skills'],
    },
  ],
};

const set = BUNDLE.sets[0];
if (set === undefined) throw new Error('fixture');
const helm = set.items[0];
if (helm === undefined) throw new Error('fixture');

const storedHelm = (overrides: Partial<SetItemRef['snapshot']> = {}): SetItemRef => {
  const ref = setItemToRef(helm, set);
  return { ...ref, snapshot: { ...ref.snapshot, ...overrides } };
};

beforeEach(() => {
  loadGameDataFile.mockResolvedValue(BUNDLE);
});

afterEach(() => {
  vi.restoreAllMocks();
  loadGameDataFile.mockReset();
});

describe('set item refs', () => {
  it('builds the snapshot from the bundle item and its set', () => {
    expect(setItemToRef(helm, set)).toEqual({
      type: 'set',
      name: "Tara's Helm",
      snapshot: {
        name: "Tara's Helm",
        setName: "Tara's Calling",
        setId: 'Tara',
        baseItem: 'Cap',
        category: 'Helm',
        reqLevel: 20,
        properties: ['+20 Defense', '+10 to Strength'],
        partial: [{ pieces: 2, lines: ['+5% Faster Run/Walk'] }],
      },
    });
  });

  it('has a key and display name', () => {
    expect(itemRefKey(storedHelm())).toBe("set:Tara's Helm");
    expect(itemRefName(storedHelm())).toBe("Tara's Helm");
  });
});

describe('resolveCurrentRef / diffRef for set items', () => {
  it('re-resolves the item by name from the sets bundle', async () => {
    const current = await resolveCurrentRef(storedHelm());
    expect(loadGameDataFile).toHaveBeenCalledWith('sets');
    expect(current).toEqual(setItemToRef(helm, set));
    expect(diffRef(storedHelm(), current).status).toBe('unchanged');
  });

  it('is unchanged when only the line wrapping differs', async () => {
    const stored = storedHelm({ properties: ['+20 Defense +10', 'to Strength'] });
    expect(diffRef(stored, await resolveCurrentRef(stored)).status).toBe('unchanged');
  });

  it('is changed when a property or a partial group changes', async () => {
    const statChange = storedHelm({ properties: ['+20 Defense', '+12 to Strength'] });
    expect(diffRef(statChange, await resolveCurrentRef(statChange)).status).toBe('changed');
    const partialChange = storedHelm({ partial: [{ pieces: 3, lines: ['+5% Faster Run/Walk'] }] });
    expect(diffRef(partialChange, await resolveCurrentRef(partialChange)).status).toBe('changed');
    const setChange = storedHelm({ setName: 'Old Name' });
    expect(diffRef(setChange, await resolveCurrentRef(setChange)).status).toBe('changed');
  });

  it('is missing when the item is gone from the bundle', async () => {
    const gone: SetItemRef = { ...storedHelm(), name: 'Removed Helm' };
    expect(await resolveCurrentRef(gone)).toBeNull();
    expect(diffRef(gone, null).status).toBe('missing');
  });

  it('keeps the stored ref when the bundle fails to load (not reported as missing)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loadGameDataFile.mockRejectedValue(new Error('offline'));
    const stored = storedHelm({ properties: ['stale'] });
    const current = await resolveCurrentRef(stored);
    expect(current).toBe(stored);
    expect(diffRef(stored, current).status).toBe('unchanged');
  });

  it('does not equal a ref of another type', () => {
    const freetext: ItemRef = { type: 'freetext', name: "Tara's Helm" };
    expect(refSnapshotsEqual(storedHelm(), freetext)).toBe(false);
  });

  it('diffs set refs in a whole build', async () => {
    const buildData: BuildData = { items: { helmet: storedHelm({ properties: ['stale'] }) }, mercenary: { helmet: storedHelm() } };
    const diffs = await computeBuildItemDiffs(buildData);
    expect(diffs.items.helmet?.status).toBe('changed');
    expect(diffs.mercenary.helmet?.status).toBe('unchanged');
  });
});

describe('refreshBuildData / resolveFullItem for set items', () => {
  it('refreshes a stale set snapshot', async () => {
    const refreshed = await refreshBuildData({ items: { helmet: storedHelm({ properties: ['stale'] }) } });
    expect(refreshed.items?.helmet).toEqual(setItemToRef(helm, set));
  });

  it('resolves the full bundle item with its set', async () => {
    expect(await resolveFullItem(storedHelm())).toEqual({ kind: 'set', item: helm, set });
  });

  it('resolves to null when the bundle fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loadGameDataFile.mockRejectedValue(new Error('offline'));
    expect(await resolveFullItem(storedHelm())).toBeNull();
  });
});
