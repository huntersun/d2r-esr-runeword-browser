import { Outlet } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { DevNotice } from '@/core/components/DevNotice';

/**
 * Shared frame for every guide route: a small, always-visible notice that the guide is experimental and still being
 * written and reviewed, then the page itself.
 */
export function GuideLayout() {
  return (
    <div className="space-y-4">
      <DevNotice icon={FlaskConical} title="Experimental.">
        This guide is still being written and reviewed; some notes are unverified drafts and may be out of date. When in doubt, trust the
        official ESR documentation.
      </DevNotice>
      <Outlet />
    </div>
  );
}
