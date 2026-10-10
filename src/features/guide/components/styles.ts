/** Shared Tailwind class strings and inline styles of the guide screens. */
import type { CSSProperties } from 'react';

/**
 * Long-form guide text always uses the default sans font: the optional Diablo font (`.diablo-font *` on html) is a
 * decorative display face that is tiring to read in paragraphs. Tailwind utilities sit in a later cascade layer than
 * the base-layer `.diablo-font *` rule, so these win without !important. Code elements are excluded so their
 * `font-mono` still applies.
 */
export const GUIDE_PROSE_FONT = 'font-sans [&_*:not(code):not(pre)]:font-sans';

/** Keyboard focus ring of the guide's custom links and buttons. */
export const FOCUS_RING = 'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';

/** Body text at ~90% of the card foreground (softer contrast for long reading); headings and bold stay at full strength. */
export const PROSE_TEXT = 'text-card-foreground/90';

export const LINK_CLASS = 'font-medium text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary';

/**
 * Inset surface for data blocks inside the note's reading panel (a `bg-card` panel): `bg-background/40` reads as a
 * recessed box in both themes. INSET_COLOR is the same colour as one opaque value, for the table scroll hint below.
 */
export const INSET = 'border bg-background/40';
const INSET_COLOR = 'color-mix(in oklch, var(--background) 40%, var(--card))';

/**
 * CSS-only scroll hint for wide tables: shadows at the edges that can still scroll (the "local" cover gradients
 * scroll with the content and hide the "scroll" shadows once an edge is reached), so nothing shows without overflow.
 * The cover colour matches the inset surface.
 */
export const SCROLL_HINT_STYLE: CSSProperties = {
  background: [
    `linear-gradient(to right, ${INSET_COLOR} 30%, transparent) left center / 2.5rem 100% no-repeat local`,
    `linear-gradient(to left, ${INSET_COLOR} 30%, transparent) right center / 2.5rem 100% no-repeat local`,
    'radial-gradient(farthest-side at 0 50%, color-mix(in oklch, var(--foreground) 22%, transparent), transparent) left center / 0.75rem 100% no-repeat scroll',
    `radial-gradient(farthest-side at 100% 50%, color-mix(in oklch, var(--foreground) 22%, transparent), transparent) right center / 0.75rem 100% no-repeat scroll ${INSET_COLOR}`,
  ].join(', '),
};
