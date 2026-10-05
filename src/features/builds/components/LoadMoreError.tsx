import { Button } from '@/components/ui/button';

interface LoadMoreErrorProps {
  readonly message: string;
  readonly onRetry: () => void;
}

/** Inline notice in a paginated list when a page failed to load; retrying is explicit (no auto-retry). */
export function LoadMoreError({ message, onRetry }: LoadMoreErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-6 text-center text-sm">
      <p className="text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
