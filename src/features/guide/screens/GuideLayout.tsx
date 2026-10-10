import { Outlet } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

/**
 * Shared frame for every guide route: a small, always-visible notice that the guide is experimental and still being
 * written and reviewed, then the page itself.
 */
export function GuideLayout() {
  return (
    <div className="space-y-4">
      <div
        role="note"
        className="mx-auto flex max-w-6xl items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
      >
        <FlaskConical className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Experimental.</span> This guide is still being written and reviewed; some notes are unverified
          drafts and may be out of date. When in doubt, trust the official ESR documentation.
        </p>
      </div>
      <Outlet />
    </div>
  );
}
