import type { TextSize } from './types';

// Font size mapping (in pixels).
// Duplicated in the pre-paint inline script in index.html (along with the 'theme' /
// 'textSize' / 'useDiabloFont' localStorage keys) - keep both in sync.
export const TEXT_SIZE_MAP: Record<TextSize, number> = {
  small: 14,
  normal: 16,
  large: 18,
  extralarge: 20,
};
