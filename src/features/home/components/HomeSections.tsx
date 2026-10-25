import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { selectAuthIsConfigured } from '@/features/auth';
import { FOCUS_RING } from '@/features/guide/components/styles';
import { getHomeSections } from '../utils/homeSections';

/** One card per header nav entry (see homeSections.ts): title, one line, and its pages as chips. */
export function HomeSections() {
  const isSupabaseEnabled = useSelector(selectAuthIsConfigured);
  const sections = getHomeSections(isSupabaseEnabled);

  return (
    <nav aria-label="Sections">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <li key={section.key} className="space-y-2 rounded-lg border bg-card p-4">
            <div>
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {section.links.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.to}
                    className={cn(
                      'inline-flex items-center rounded-full border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-accent/40',
                      FOCUS_RING
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
