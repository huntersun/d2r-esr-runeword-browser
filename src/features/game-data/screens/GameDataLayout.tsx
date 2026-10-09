import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { GameDataVersionBanner } from '../components/GameDataVersionBanner';

const SUB_PAGES = [
  { to: 'bases', label: 'Bases' },
  { to: 'best-base', label: 'Best Base' },
  { to: 'affixes', label: 'Affixes' },
  { to: 'types', label: 'Item Types' },
] as const;

// Same styling as the header nav links
const TAB_BASE = 'rounded-md px-3 py-2 text-sm font-medium transition-colors';
const TAB_INACTIVE = 'text-muted-foreground hover:text-foreground';
const TAB_ACTIVE = 'bg-accent text-accent-foreground';

export function GameDataLayout() {
  return (
    <div>
      <div className="mb-4 space-y-2 border-b pb-3">
        <h1 className="text-2xl font-bold">Game Data</h1>
        <GameDataVersionBanner />
        <nav className="flex flex-wrap gap-1" aria-label="Game data pages">
          {SUB_PAGES.map((page) => (
            <NavLink key={page.to} to={page.to} className={({ isActive }) => cn(TAB_BASE, isActive ? TAB_ACTIVE : TAB_INACTIVE)}>
              {page.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
