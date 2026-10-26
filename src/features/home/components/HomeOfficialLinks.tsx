import { OFFICIAL_LINKS } from '@/core/navigation/navConfig';
import { HomeLinkCard } from './HomeLinkCard';

/** "Official ESR links" block: the same list as the header's external-links menu (OFFICIAL_LINKS). */
export function HomeOfficialLinks() {
  return (
    <section aria-labelledby="home-official-heading" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <div className="space-y-1">
        <h2 id="home-official-heading" className="text-lg font-semibold">
          Official ESR links
        </h2>
        <p className="text-sm text-muted-foreground">Everything from the mod author and the ESR community server.</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OFFICIAL_LINKS.map((link) => (
          <HomeLinkCard key={link.key} label={link.label} href={link.href} description={link.description} mutedDescription />
        ))}
      </ul>
    </section>
  );
}
