/** A random id for a library entry: `crypto.randomUUID` where available, else a time + random fallback. */
export function newEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `lf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
