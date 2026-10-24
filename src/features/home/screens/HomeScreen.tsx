import { useSelector } from 'react-redux';
import { selectAuthIsConfigured } from '@/features/auth';
import { HomeFooter } from '../components/HomeFooter';
import { HomeHero } from '../components/HomeHero';
import { HomeSections } from '../components/HomeSections';
import { HomeStartHere } from '../components/HomeStartHere';
import { LatestBuilds } from '../components/LatestBuilds';

/**
 * Home page (`/`): what the site offers. Renders without the startup loading gate (see staticBundleRoutes.ts); the
 * parts that need the synced item data (search over item names, the docs version) fill in once the sync has run.
 */
export function HomeScreen() {
  const isSupabaseEnabled = useSelector(selectAuthIsConfigured);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <HomeHero />
      <HomeSections />
      {isSupabaseEnabled && <LatestBuilds />}
      <HomeStartHere />
      <HomeFooter />
    </div>
  );
}
