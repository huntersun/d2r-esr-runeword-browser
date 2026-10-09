import { Spinner } from '@/components/ui/spinner';

/** Same look as the route-level Suspense fallback. */
export function GameDataLoading() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <Spinner className="size-8" />
      <span>Loading game data...</span>
    </div>
  );
}
