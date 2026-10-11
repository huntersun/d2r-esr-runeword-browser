import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface DevNoticeProps {
  readonly icon: LucideIcon;
  /** The bold lead-in, e.g. "Experimental." */
  readonly title: string;
  readonly children: ReactNode;
}

/** A small, always-visible amber notice above a section that is still being built or reviewed. */
export function DevNotice({ icon: Icon, title, children }: DevNoticeProps) {
  return (
    <div
      role="note"
      className="mx-auto flex max-w-6xl items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">{title}</span> {children}
      </p>
    </div>
  );
}
