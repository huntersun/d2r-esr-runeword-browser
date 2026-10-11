/**
 * After removing the entry at `position` from a list inside `container`: once React has re-rendered, focus the
 * remove button that took its place (`[data-remove]`), else the fallback (`[data-focus-fallback]`, or the first
 * button inside it), so keyboard focus does not drop to the page.
 */
export function focusAfterRemoval(container: HTMLElement | null, position: number): void {
  requestAnimationFrame(() => {
    if (container === null) return;
    const next = Array.from(container.querySelectorAll<HTMLElement>('[data-remove]')).at(position);
    const fallback = container.querySelector<HTMLElement>('[data-focus-fallback]');
    (next ?? fallback?.querySelector<HTMLElement>('button') ?? fallback)?.focus();
  });
}
