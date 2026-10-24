import { cn } from '@/lib/utils';
import { OFFICIAL_REFERENCES, officialReferenceHref } from '../utils/guideHome';
import { ExternalLink } from './ExternalLink';
import { SectionLabel } from './SectionLabel';
import { FOCUS_RING, GUIDE_PROSE_FONT } from './styles';

/** "Official reference" strip on `/guide`: the official ESR documentation pages (external, new tab). */
export function GuideOfficialReference() {
  return (
    <section aria-labelledby="guide-reference-heading">
      <SectionLabel id="guide-reference-heading" className="mb-1">
        Official reference
      </SectionLabel>
      <p className={cn('mb-2 text-sm text-muted-foreground', GUIDE_PROSE_FONT)}>
        The full tables live on the official ESR site; the notes above link to the matching section.
      </p>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border bg-card p-3 sm:grid-cols-2">
        {OFFICIAL_REFERENCES.map((reference) => (
          <li key={reference.file} className="min-w-0">
            <ExternalLink
              href={officialReferenceHref(reference)}
              className={cn('inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary hover:underline', FOCUS_RING)}
              iconClassName="size-3.5 shrink-0"
            >
              {reference.label}
            </ExternalLink>
            <span className={cn('block text-xs text-muted-foreground', GUIDE_PROSE_FONT)}>{reference.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
