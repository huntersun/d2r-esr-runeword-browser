import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/PageShell';
import { TAB_ACTIVE, TAB_BASE, TAB_INACTIVE } from '@/core/components/navTabClasses';
import { GameDataVersionBanner } from '../components/GameDataVersionBanner';

const SUB_PAGES = [
  { to: 'bases', label: 'Bases' },
  { to: 'sets', label: 'Sets' },
  { to: 'best-base', label: 'Best Base' },
  { to: 'affixes', label: 'Affixes' },
  { to: 'types', label: 'Item Types' },
  { to: 'enhance', label: 'Enhance' },
  { to: 'cube', label: 'Cube' },
  { to: 'materials', label: 'Materials' },
  { to: 'areas', label: 'Areas' },
] as const;

export function GameDataLayout() {
  return (
    <PageShell
      title="Game Data"
      meta={<GameDataVersionBanner />}
      nav={
        <nav className="flex flex-wrap gap-1" aria-label="Game data pages">
          {SUB_PAGES.map((page) => (
            <NavLink key={page.to} to={page.to} className={({ isActive }) => cn(TAB_BASE, isActive ? TAB_ACTIVE : TAB_INACTIVE)}>
              {page.label}
            </NavLink>
          ))}
        </nav>
      }
    >
      <Outlet />
    </PageShell>
  );
}
