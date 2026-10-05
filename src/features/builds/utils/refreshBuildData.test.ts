import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@/core/db';
import type { BuildData } from '../buildData';
import { refreshBuildData } from './refreshBuildData';

afterEach(async () => {
  await db.htmUniqueItems.clear();
});

describe('refreshBuildData', () => {
  it('refreshes a unique snapshot from current local data', async () => {
    const id = await db.htmUniqueItems.add({
      name: 'Harlequin Crest',
      baseItem: 'Shako',
      baseItemCode: 'uap',
      page: 'armors',
      category: 'Helm',
      itemLevel: 69,
      reqLevel: 62,
      properties: ['+2 to All Skills (current)'],
      isAncientCoupon: false,
      gambleItem: '',
      notes: '',
    });

    const buildData: BuildData = {
      items: {
        helmet: {
          type: 'unique',
          id: id as number,
          snapshot: {
            name: 'Harlequin Crest',
            baseItem: 'Shako',
            category: 'Helm',
            reqLevel: 62,
            properties: ['+2 to All Skills (STALE)'],
          },
        },
      },
    };

    const refreshed = await refreshBuildData(buildData);
    const helmet = refreshed.items?.helmet;
    expect(helmet?.type).toBe('unique');
    if (helmet?.type === 'unique') {
      expect(helmet.snapshot.properties).toEqual(['+2 to All Skills (current)']);
    }
  });

  it('keeps the existing reference when the item no longer exists', async () => {
    const buildData: BuildData = {
      items: {
        helmet: {
          type: 'unique',
          id: 99999,
          snapshot: { name: 'Removed Item', baseItem: 'X', category: 'Helm', reqLevel: 1, properties: ['kept'] },
        },
      },
    };

    const refreshed = await refreshBuildData(buildData);
    const helmet = refreshed.items?.helmet;
    if (helmet?.type === 'unique') {
      expect(helmet.snapshot.properties).toEqual(['kept']);
    }
  });

  it('leaves freetext entries untouched', async () => {
    const buildData: BuildData = { items: { gloves: { type: 'freetext', name: 'GG rare gloves' } } };
    const refreshed = await refreshBuildData(buildData);
    expect(refreshed.items?.gloves).toEqual({ type: 'freetext', name: 'GG rare gloves' });
  });

  it('preserves per-item crafting notes through a snapshot refresh', async () => {
    const buildData: BuildData = {
      items: { gloves: { type: 'freetext', name: 'GG rare gloves' } },
      itemNotes: { gloves: 'Corrupt for +1 skills' },
      mercenaryNotes: { helmet: 'D-Stone until very fast attack speed' },
    };
    const refreshed = await refreshBuildData(buildData);
    expect(refreshed.itemNotes).toEqual({ gloves: 'Corrupt for +1 skills' });
    expect(refreshed.mercenaryNotes).toEqual({ helmet: 'D-Stone until very fast attack speed' });
  });
});

describe('refreshBuildData with same-name variants', () => {
  it('keeps the saved variant instead of rewriting it to a same-name sibling', async () => {
    const shared = { name: "Lycander's Aim", baseItem: 'Ceremonial Bow', category: 'Amazon Bow', reqLevel: 42 } as const;
    const rest = { baseItemCode: 'am7', page: 'weapons', itemLevel: 50, gambleItem: '', notes: '' } as const;
    await db.htmUniqueItems.add({ ...shared, ...rest, properties: ['+(50 to 100) to Dexterity'], isAncientCoupon: false });
    await db.htmUniqueItems.add({ ...shared, ...rest, properties: ['-200% Target Defense'], isAncientCoupon: true });

    const refreshed = await refreshBuildData({
      items: { weapon: { type: 'unique', id: 987654, snapshot: { ...shared, properties: ['-200% Target Defense'] } } },
    });
    const weapon = refreshed.items?.weapon;
    expect(weapon?.type === 'unique' && weapon.snapshot.properties).toEqual(['-200% Target Defense']);
  });
});
