/** File-download helpers shared by features. */

/** Lower-case ASCII words joined by dashes, for file names (accents dropped); `fallback` when nothing is left. */
export function slugify(name: string, fallback: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? fallback : slug;
}

/** Saves `blob` as a file through a temporary object URL. */
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/** Saves `text` as a UTF-8 JSON file. */
export function downloadTextFile(fileName: string, text: string): void {
  downloadBlob(fileName, new Blob([text], { type: 'application/json;charset=utf-8' }));
}
