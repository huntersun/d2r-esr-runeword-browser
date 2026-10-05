import Dexie from 'dexie';
import { db } from './db';

/** Errors Dexie raises when the stored database cannot be migrated to the declared schema. */
const UNUPGRADABLE_ERRORS = new Set(['UpgradeError', 'VersionError']);

/**
 * Opens the cache database. Dexie cannot migrate some old schemas (e.g. a
 * changed primary key) and refuses versions newer than the declared one; the
 * database is only a cache of the remote data, so it is deleted and recreated
 * empty, and the startup check then refetches everything.
 */
export async function openDatabase(): Promise<void> {
  try {
    await db.open();
  } catch (error) {
    if (!(error instanceof Error) || !UNUPGRADABLE_ERRORS.has(error.name)) throw error;
    console.warn('[DB] Cache database cannot be upgraded, recreating it:', error);
    db.close();
    await Dexie.delete(db.name);
    await db.open();
  }
}
