import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GuideSchemaError, type LoadedGuide } from '../engine/browser/loadGuide';
import { useGuide } from '../hooks/useGuide';
import { GuideContext } from '../hooks/useLoadedGuide';

/** Same look as the route-level Suspense fallback. */
function GuideLoading() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <Spinner className="size-8" />
      <span>Loading guide...</span>
    </div>
  );
}

interface GuideErrorProps {
  readonly error: unknown;
  readonly onRetry: () => void;
}

function GuideError({ error, onRetry }: GuideErrorProps) {
  const outdated = error instanceof GuideSchemaError;
  const message = error instanceof Error ? error.message : String(error);

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
          {outdated ? 'Guide out of date' : 'Could not load the guide'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {outdated ? 'The guide on the server is newer than this page. Reload to get the latest version.' : message}
        </p>
        {outdated ? (
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload page
          </Button>
        ) : (
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Loads the guide bundle; shows a spinner / error card until it is ready, then provides it to `children`. */
interface GuideGateProps {
  readonly children: (guide: LoadedGuide) => ReactNode;
}

export function GuideGate({ children }: GuideGateProps) {
  const guide = useGuide();
  if (guide.status === 'loading') return <GuideLoading />;
  if (guide.status === 'error') return <GuideError error={guide.error} onRetry={guide.retry} />;
  return <GuideContext value={guide.data}>{children(guide.data)}</GuideContext>;
}
