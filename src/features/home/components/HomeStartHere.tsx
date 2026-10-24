import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuideOfficialReference } from '@/features/guide/components/GuideOfficialReference';

/** "New to ESR?" block: a pointer to the guide plus the guide's official-docs strip (the same component). */
export function HomeStartHere() {
  return (
    <section aria-labelledby="home-start-heading" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 id="home-start-heading" className="text-lg font-semibold">
            New to ESR? Start here
          </h2>
          <p className="text-sm text-muted-foreground">
            ESR changes a lot from vanilla D2R. The guide explains what is different and where to go next, one step at a time.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/guide">
            <Compass aria-hidden />
            Open the guide
          </Link>
        </Button>
      </div>
      <GuideOfficialReference description="The full tables and mechanics live on the official ESR site." />
    </section>
  );
}
