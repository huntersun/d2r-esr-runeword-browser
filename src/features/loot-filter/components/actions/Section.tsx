import type { ReactNode } from 'react';

interface SectionProps {
  readonly title: string;
  /** A small muted heading and tight spacing (the Test tab's result) instead of a ruled form section. */
  readonly dense?: boolean;
  readonly children: ReactNode;
}

/** A titled group: a form section of the actions editor, or a block of the test result. */
export function Section({ title, dense = false, children }: SectionProps) {
  if (dense) {
    return (
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {children}
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
