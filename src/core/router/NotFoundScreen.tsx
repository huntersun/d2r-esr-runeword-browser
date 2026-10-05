import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Shown for URLs that match no route (catch-all `*` route). */
export function NotFoundScreen() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-4">The page you are looking for does not exist.</p>
        <Button asChild variant="outline">
          <Link to="/">Back to Runewords</Link>
        </Button>
      </div>
    </div>
  );
}
