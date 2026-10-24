import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { startBuilds } from '@/core/startup';
import { RequestState } from '@/core/types';
import { BuildCard } from '@/features/builds/components/BuildCard';
import { BuildCardSkeleton } from '@/features/builds/components/BuildCardSkeleton';
import { RECENT_BUILDS_COUNT } from '@/features/builds/constants';
import { fetchRecentBuildsRequested, selectRecentBuilds, selectRecentBuildsStatus } from '@/features/builds/store';
import { FOCUS_RING } from '@/features/guide/components/styles';
import { cn } from '@/lib/utils';
import { useDocsEsrVersion } from '../hooks/useDocsEsrVersion';

/**
 * "Latest builds" strip (only mounted when Supabase is configured). It waits for the builds saga to listen
 * (`startBuilds`, as the builds routes do via loadAfter) before asking for the newest builds, through a separate
 * "recent" query in the builds slice that leaves the /builds list and its filters alone. Hidden on error or when there
 * are no builds yet.
 */
export function LatestBuilds() {
  const dispatch = useDispatch();
  const builds = useSelector(selectRecentBuilds);
  const status = useSelector(selectRecentBuildsStatus);
  const docsVersion = useDocsEsrVersion();

  useEffect(() => {
    let cancelled = false;
    void startBuilds().then(() => {
      if (!cancelled) dispatch(fetchRecentBuildsRequested());
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (status === RequestState.ERROR) return null;
  if (status === RequestState.SUCCESS && builds.length === 0) return null;
  const loading = status !== RequestState.SUCCESS;

  return (
    <section aria-labelledby="home-builds-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-builds-heading" className="text-lg font-semibold">
          Latest builds
        </h2>
        <Link
          to="/builds"
          className={cn('inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline', FOCUS_RING)}
        >
          Browse all
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {loading
          ? Array.from({ length: RECENT_BUILDS_COUNT }, (_, index) => (
              // One skeleton row; on phones only the first card shows so the placeholder stays a single row.
              <li key={index} className={index > 0 ? 'hidden md:block' : undefined}>
                <BuildCardSkeleton />
              </li>
            ))
          : builds.map((build) => (
              <li key={build.id}>
                <BuildCard build={build} currentEsrVersion={docsVersion ?? null} />
              </li>
            ))}
      </ul>
    </section>
  );
}
