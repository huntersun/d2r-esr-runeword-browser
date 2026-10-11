import { Outlet } from 'react-router-dom';
import { Construction } from 'lucide-react';

/**
 * Shared frame for every loot-filter route: a small, always-visible notice that the editor is still under
 * development and testing (the guide has the same kind of frame), then the page itself.
 */
export function LootFilterLayout() {
  return (
    <div className="space-y-4">
      <div
        role="note"
        className="mx-auto flex max-w-6xl items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
      >
        <Construction className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Under development.</span> This editor is still being built and tested; a downloaded filter may not
          behave in the game exactly as shown here. Check it in the ESR Launcher before relying on it.
        </p>
      </div>
      <Outlet />
    </div>
  );
}
