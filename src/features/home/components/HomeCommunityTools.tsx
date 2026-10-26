import { ExternalLink } from '@/components/ExternalLink';
import { Badge } from '@/components/ui/badge';
import { COMMUNITY_TOOL_KIND_LABELS, COMMUNITY_TOOLS, type CommunityTool } from '@/core/navigation/navConfig';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/guide/components/styles';

const LINK_ICON = 'ml-0.5 inline size-[0.9em] align-[-0.1em]';

function CommunityToolCard({ tool }: { readonly tool: CommunityTool }) {
  return (
    <li className="space-y-1.5 rounded-lg border bg-background p-4">
      <ExternalLink
        href={tool.href}
        className={cn('text-sm font-medium text-primary hover:underline', FOCUS_RING)}
        iconClassName={LINK_ICON}
      >
        {tool.label}
      </ExternalLink>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">by {tool.author}</span>
        <Badge variant={tool.kind === 'archive' ? 'secondary' : 'outline'}>{COMMUNITY_TOOL_KIND_LABELS[tool.kind]}</Badge>
      </div>
      <p className="text-sm">{tool.description}</p>
      {tool.caveat !== undefined && <p className="text-xs text-muted-foreground">{tool.caveat}</p>}
      {tool.sourceUrl !== undefined && (
        <ExternalLink
          href={tool.sourceUrl}
          className={cn('inline-block text-xs text-muted-foreground hover:text-foreground hover:underline', FOCUS_RING)}
          iconClassName={LINK_ICON}
        >
          Source on GitHub
        </ExternalLink>
      )}
    </li>
  );
}

/** "Community tools" block: fan-made ESR tools by other players (static list from navConfig). */
export function HomeCommunityTools() {
  return (
    <section aria-labelledby="home-community-heading" className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <div className="space-y-1">
        <h2 id="home-community-heading" className="text-lg font-semibold">
          Community tools
        </h2>
        <p className="text-sm text-muted-foreground">
          Fan-made ESR tools by other players. Not affiliated with this site or the mod; each project has its own licence and support.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COMMUNITY_TOOLS.map((tool) => (
          <CommunityToolCard key={tool.key} tool={tool} />
        ))}
      </ul>
    </section>
  );
}
