import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SetInfo, SetItemInfo } from '@/features/game-data/engine/schema';
import { cn } from '@/lib/utils';
import type { SetBonusGroupSnapshot } from '../buildData';
import { SET_NAME_CLASS, setItemPageUrl } from '../utils/setItems';

interface SetPartialGroupsProps {
  readonly groups: readonly SetBonusGroupSnapshot[];
  /** Pieces of the set equipped in this section; undefined → groups shown without an active/inactive state. */
  readonly equippedPieces?: number;
}

/** An item's own partial bonuses as "2 items" / "3 items" groups; inactive groups are muted. */
export function SetPartialGroups({ groups, equippedPieces }: SetPartialGroupsProps) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-2 border-t pt-2">
      {groups.map((group) => {
        const inactive = equippedPieces !== undefined && group.pieces > equippedPieces;
        return (
          <div key={group.pieces} className={cn('space-y-0.5 text-sm', inactive ? 'text-muted-foreground' : SET_NAME_CLASS)}>
            <p className="text-xs font-semibold uppercase tracking-wide">
              {group.pieces} items
              {equippedPieces !== undefined && <span className="ml-1 font-normal normal-case">{inactive ? '(inactive)' : '(active)'}</span>}
            </p>
            <ul className="space-y-0.5">
              {group.lines.map((line, index) => (
                <li key={`${String(index)}-${line}`}>{line}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

interface SetItemBuildCardProps {
  readonly item: SetItemInfo;
  readonly set: SetInfo;
  readonly equippedPieces?: number;
}

/** A set item in a build slot, from the current sets.json bundle. */
export function SetItemBuildCard({ item, set, equippedPieces }: SetItemBuildCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-0">
        <CardTitle className={cn('min-w-0 break-words text-lg', SET_NAME_CLASS)}>{item.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Set:{' '}
          <Link to={setItemPageUrl(item.name)} className={cn('underline-offset-2 hover:underline', SET_NAME_CLASS)}>
            {set.name}
          </Link>
        </p>
        <p className="text-sm text-muted-foreground">
          {item.baseName}
          {item.category !== '' && item.category !== item.baseName && ` · ${item.category}`} · Req Lvl {item.reqLevel}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {item.lines.length > 0 && (
          <ul className="space-y-0.5 text-center text-[#8080E6]">
            {item.lines.map((line, index) => (
              <li key={`${String(index)}-${line}`}>{line}</li>
            ))}
          </ul>
        )}
        <SetPartialGroups groups={item.partial} equippedPieces={equippedPieces} />
      </CardContent>
    </Card>
  );
}
