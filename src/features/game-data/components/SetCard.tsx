import { CopyLinkButton } from '@/components/CopyLinkButton';
import { Card } from '@/components/ui/card';
import { buildShareUrl } from '@/core/utils/filterUrlParams';
import { cn } from '@/lib/utils';
import type { SetBonusGroup, SetInfo, SetItemInfo } from '../engine/schema';
import type { SourceIndex } from '../engine/sourceLookup';
import { DocsLink } from './CubeFamilySection';
import { BonusLines } from './EnhanceParts';
import { ItemSourceLine } from './ItemSourceLine';
import { reqLevelText, SETS_ROUTE, setDifficulty, setDocsUrl, setFocusParams } from '../utils/sets';

const SET_NAME = 'text-green-700 dark:text-green-400';
const BADGE = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs leading-tight';

function PiecesPill({ pieces, className }: { readonly pieces: number; readonly className?: string }) {
  return <span className={cn(BADGE, 'font-medium', className)}>{pieces} items</span>;
}

/** Per-item bonuses: "2 items" pill, then the lines */
function ItemBonuses({ groups }: { readonly groups: readonly SetBonusGroup[] }) {
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.pieces} className="space-y-0.5">
          <PiecesPill pieces={group.pieces} className="border-green-600/40 bg-green-600/10 text-green-800 dark:text-green-300" />
          <BonusLines lines={group.lines} className="text-green-700 dark:text-green-400" />
        </div>
      ))}
    </div>
  );
}

function SetItemRow({
  item,
  highlighted,
  sources,
}: {
  readonly item: SetItemInfo;
  readonly highlighted: boolean;
  readonly sources: SourceIndex | null;
}) {
  return (
    <li
      className={cn(
        'grid gap-x-4 gap-y-2 px-3 py-2.5 text-sm sm:grid-cols-2',
        highlighted && 'bg-amber-500/10 shadow-[inset_3px_0_0] shadow-amber-500/70'
      )}
    >
      <div className="min-w-0 space-y-1">
        <div>
          <p className={cn('font-medium', SET_NAME)}>{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.baseName}
            {item.category !== '' && item.category !== item.baseName && ` · ${item.category}`}
            {' · '}Lvl {item.level} · Req Lvl {item.reqLevel}
          </p>
        </div>
        <BonusLines lines={item.lines} />
        <ItemSourceLine index={sources} name={item.name} kind="set" />
      </div>
      {item.partial.length > 0 && <ItemBonuses groups={item.partial} />}
    </li>
  );
}

/** A set-wide bonus box ("2 items", "Full set") */
function SetBonusBox({ label, lines }: { readonly label: string; readonly lines: readonly string[] }) {
  return (
    <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">{label}</p>
      <ul className="space-y-0.5 text-amber-900 dark:text-amber-200">
        {lines.map((line, index) => (
          // Lines can repeat; the index keeps keys unique
          <li key={`${String(index)}-${line}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

interface SetCardProps {
  readonly set: SetInfo;
  /** Indexes of the items to highlight */
  readonly highlighted: ReadonlySet<number>;
  readonly sources: SourceIndex | null;
}

/** One set: header (class, pieces, level range, links), its items, then the set-wide partial and full bonuses */
export function SetCard({ set, highlighted, sources }: SetCardProps) {
  const getShareUrl = () => buildShareUrl(SETS_ROUTE, setFocusParams(set));
  const difficulty = setDifficulty(set);
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2.5">
        <h3 className={cn('text-base font-semibold', SET_NAME)}>{set.name}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(BADGE, set.className === null ? 'text-muted-foreground' : 'border-primary/40 bg-primary/10')}>
            {set.className ?? 'Any class'}
          </span>
          {difficulty !== null && <span className={cn(BADGE, 'border-sky-500/40 bg-sky-500/10')}>{difficulty}</span>}
          <span className={BADGE}>{set.items.length} pieces</span>
          <span className={BADGE}>{reqLevelText(set.reqLevel)}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <DocsLink href={setDocsUrl(set)} className="text-xs">
            Official page
          </DocsLink>
          <CopyLinkButton getShareUrl={getShareUrl} />
        </div>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <ul className="divide-y">
          {set.items.map((item, index) => (
            <SetItemRow key={`${String(index)}-${item.name}`} item={item} highlighted={highlighted.has(index)} sources={sources} />
          ))}
        </ul>
        <div className="space-y-2 border-t p-3 lg:border-t-0 lg:border-l">
          {set.partial.map((group) => (
            <SetBonusBox key={group.pieces} label={`${String(group.pieces)} items`} lines={group.lines} />
          ))}
          <SetBonusBox label="Full set" lines={set.full} />
        </div>
      </div>
    </Card>
  );
}
