import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';

/** The ESR version of the synced HTM docs data (Dexie metadata); undefined before the first sync has stored it. */
export function useDocsEsrVersion(): string | undefined {
  return useLiveQuery(async () => (await db.metadata.get('esrVersion'))?.value);
}
