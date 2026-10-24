import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/core/layouts/AppLayout';
import { RouteErrorScreen } from './RouteErrorScreen';
import { NotFoundScreen } from './NotFoundScreen';
import { Spinner } from '@/components/ui/spinner';
import { startBuilds } from '@/core/startup';
import { loadAfter } from './loadAfter';

const RunewordsScreen = lazy(async () => {
  const module = await import('@/features/runewords');
  return { default: module.RunewordsScreen };
});

const GemwordsScreen = lazy(async () => {
  const module = await import('@/features/gemwords');
  return { default: module.GemwordsScreen };
});

const GuideLayout = lazy(async () => {
  const module = await import('@/features/guide');
  return { default: module.GuideLayout };
});

const GuideSpineScreen = lazy(async () => {
  const module = await import('@/features/guide');
  return { default: module.GuideSpineScreen };
});

const GuideNoteScreen = lazy(async () => {
  const module = await import('@/features/guide');
  return { default: module.GuideNoteScreen };
});

const GuideMapScreen = lazy(async () => {
  const module = await import('@/features/guide');
  return { default: module.GuideMapScreen };
});

const SocketablesScreen = lazy(async () => {
  const module = await import('@/features/socketables');
  return { default: module.SocketablesScreen };
});

const HtmUniqueItemsScreen = lazy(async () => {
  const module = await import('@/features/htm-unique-items');
  return { default: module.HtmUniqueItemsScreen };
});

const MythicalUniquesScreen = lazy(async () => {
  const module = await import('@/features/mythical-uniques');
  return { default: module.MythicalUniquesScreen };
});

const AscendanciesScreen = lazy(async () => {
  const module = await import('@/features/ascendancies');
  return { default: module.AscendanciesScreen };
});

// The builds screens dispatch fetch requests in mount effects, so they must not mount before the builds saga listens
// (an action dispatched earlier is silently lost and the page stays on skeletons). `startBuilds` is idempotent and
// resolves at once when Supabase is not configured, where the screens show their "not configured" state instead.
const loadBuildsFeature = () => loadAfter(() => import('@/features/builds'), startBuilds);

const BuildsScreen = lazy(async () => {
  const module = await loadBuildsFeature();
  return { default: module.BuildsScreen };
});

const CreateBuildScreen = lazy(async () => {
  const module = await loadBuildsFeature();
  return { default: module.CreateBuildScreen };
});

const EditBuildScreen = lazy(async () => {
  const module = await loadBuildsFeature();
  return { default: module.EditBuildScreen };
});

const BuildDetailScreen = lazy(async () => {
  const module = await loadBuildsFeature();
  return { default: module.BuildDetailScreen };
});

const UserProfileScreen = lazy(async () => {
  const module = await loadBuildsFeature();
  return { default: module.UserProfileScreen };
});

const GameDataLayout = lazy(async () => {
  const module = await import('@/features/game-data');
  return { default: module.GameDataLayout };
});

const GameDataBasesScreen = lazy(async () => {
  const module = await import('@/features/game-data');
  return { default: module.BasesScreen };
});

const GameDataBestBaseScreen = lazy(async () => {
  const module = await import('@/features/game-data');
  return { default: module.BestBaseScreen };
});

const GameDataAffixesScreen = lazy(async () => {
  const module = await import('@/features/game-data');
  return { default: module.AffixesScreen };
});

const GameDataItemTypesScreen = lazy(async () => {
  const module = await import('@/features/game-data');
  return { default: module.ItemTypesScreen };
});

const GameDataEnhanceScreen = lazy(async () => {
  const module = await import('@/features/game-data');
  return { default: module.EnhanceScreen };
});

const LootFilterLayout = lazy(async () => {
  const module = await import('@/features/loot-filter');
  return { default: module.LootFilterLayout };
});

const LootFilterLibraryScreen = lazy(async () => {
  const module = await import('@/features/loot-filter');
  return { default: module.LootFilterLibraryScreen };
});

const LootFilterEditorScreen = lazy(async () => {
  const module = await import('@/features/loot-filter');
  return { default: module.LootFilterEditorScreen };
});

const routeLoadingFallback = (
  <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
    <Spinner className="size-8" />
    <span>Loading page...</span>
  </div>
);

function routeElement(Screen: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={routeLoadingFallback}>
      <Screen />
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      errorElement: <RouteErrorScreen />,
      children: [
        { index: true, element: routeElement(RunewordsScreen) },
        {
          path: 'guide',
          element: routeElement(GuideLayout),
          children: [
            { index: true, element: routeElement(GuideSpineScreen) },
            // Static segment: the router ranks it above ':slug' (a note with the slug 'map' would be shadowed).
            { path: 'map', element: routeElement(GuideMapScreen) },
            { path: ':slug', element: routeElement(GuideNoteScreen) },
          ],
        },
        { path: 'gemwords', element: routeElement(GemwordsScreen) },
        { path: 'socketables', element: routeElement(SocketablesScreen) },
        { path: 'uniques', element: routeElement(HtmUniqueItemsScreen) },
        { path: 'mythicals', element: routeElement(MythicalUniquesScreen) },
        { path: 'ascendancies', element: routeElement(AscendanciesScreen) },
        {
          path: 'game-data',
          element: routeElement(GameDataLayout),
          children: [
            { index: true, element: <Navigate to="bases" replace /> },
            { path: 'bases', element: routeElement(GameDataBasesScreen) },
            { path: 'best-base', element: routeElement(GameDataBestBaseScreen) },
            { path: 'affixes', element: routeElement(GameDataAffixesScreen) },
            { path: 'types', element: routeElement(GameDataItemTypesScreen) },
            { path: 'enhance', element: routeElement(GameDataEnhanceScreen) },
          ],
        },
        {
          path: 'loot-filters',
          element: routeElement(LootFilterLayout),
          children: [
            { index: true, element: routeElement(LootFilterLibraryScreen) },
            { path: ':id', element: routeElement(LootFilterEditorScreen) },
          ],
        },
        { path: 'builds', element: routeElement(BuildsScreen) },
        { path: 'builds/new', element: routeElement(CreateBuildScreen) },
        { path: 'builds/:buildId/edit', element: routeElement(EditBuildScreen) },
        { path: 'build/:buildId', element: routeElement(BuildDetailScreen) },
        { path: 'user/:userId', element: routeElement(UserProfileScreen) },
        { path: '*', element: <NotFoundScreen /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
