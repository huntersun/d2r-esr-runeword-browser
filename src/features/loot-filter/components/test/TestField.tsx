import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TestFieldProps {
  readonly id: string;
  readonly label: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/** A small label above its control, for the Test tab's dense forms. */
export function TestField({ id, label, className, children }: TestFieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}
