import { createContext, use } from 'react';
import type { LoadedGuide } from '../engine/browser/loadGuide';

/** The loaded guide (manifest + bundle) for the components below a guide screen (link peeks, glossary hovers, chips). */
export const GuideContext = createContext<LoadedGuide | null>(null);

export function useLoadedGuide(): LoadedGuide {
  const guide = use(GuideContext);
  if (guide === null) throw new Error('useLoadedGuide must be used inside <GuideGate>');
  return guide;
}
