import { slugify } from '@/utils/download';

export { downloadTextFile } from '@/utils/download';

export function filterFileName(name: string): string {
  return `${slugify(name, 'loot-filter')}.json`;
}
