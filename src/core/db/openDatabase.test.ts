import { afterEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { db } from './db';
import { openDatabase } from './openDatabase';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('openDatabase', () => {
  it('recreates a cache database whose schema cannot be upgraded', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    db.close();
    await Dexie.delete(db.name);

    // An old install: runewords keyed by name only (the primary key changed later)
    const legacy = new Dexie(db.name);
    legacy.version(3).stores({ runewords: 'name', affixes: 'pattern' });
    await legacy.table('runewords').put({ name: 'Old' });
    legacy.close();

    await openDatabase();

    expect(db.isOpen()).toBe(true);
    expect(db.verno).toBe(14);
    expect(await db.runewords.count()).toBe(0);
    expect(db.tables.map((table) => table.name)).not.toContain('affixes');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('opens a compatible database without deleting it', async () => {
    db.close();
    await Dexie.delete(db.name);
    await openDatabase();
    await db.metadata.put({ key: 'esrVersion', value: '1.0.0' });
    db.close();

    await openDatabase();

    expect((await db.metadata.get('esrVersion'))?.value).toBe('1.0.0');
  });
});
