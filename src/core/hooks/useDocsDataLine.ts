import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { formatDocsDataLine } from '@/core/utils/docsDataLine';

interface DocsDataInfo {
  /** ESR version stored by the last HTM sync; undefined before the first sync has stored one. */
  readonly version: string | undefined;
  /** "Docs data: ESR 3.2.24 (site updated 21 Oct 2026)"; null while the version is unknown. */
  readonly line: string | null;
}

/** Docs data version and freshness from the Dexie metadata written by the HTM sync (`esrVersion`, `docsLastModified`). */
export function useDocsDataLine(): DocsDataInfo {
  const meta = useLiveQuery(async () => {
    const [version, lastModified] = await Promise.all([db.metadata.get('esrVersion'), db.metadata.get('docsLastModified')]);
    return { version: version?.value, lastModified: lastModified?.value };
  });
  return { version: meta?.version, line: formatDocsDataLine(meta?.version, meta?.lastModified) };
}
