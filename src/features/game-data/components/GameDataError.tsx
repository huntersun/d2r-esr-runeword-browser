import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameDataSchemaError } from '../engine/browser/loadGameData';

interface GameDataErrorProps {
  readonly error: unknown;
  readonly onRetry: () => void;
}

export function GameDataError({ error, onRetry }: GameDataErrorProps) {
  const outdated = error instanceof GameDataSchemaError;
  const message = error instanceof Error ? error.message : String(error);

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
          {outdated ? 'Game data out of date' : 'Could not load game data'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {outdated ? 'The game data on the server is newer than this page. Reload to get the latest version.' : message}
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
