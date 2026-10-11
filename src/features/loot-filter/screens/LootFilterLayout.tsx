import { Outlet } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { DevNotice } from '@/core/components/DevNotice';

/**
 * Shared frame for every loot-filter route: a small, always-visible notice that the editor is still under
 * development and testing (the guide has the same kind of frame), then the page itself.
 */
export function LootFilterLayout() {
  return (
    <div className="space-y-4">
      <DevNotice icon={Construction} title="Under development.">
        This editor is still being built and tested; a downloaded filter may not behave in the game exactly as shown here. Check it in the
        ESR Launcher before relying on it.
      </DevNotice>
      <Outlet />
    </div>
  );
}
