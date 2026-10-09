import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BaseItem, ItemTypeInfo } from '../engine/schema';
import { BASE_TIER_LABELS, TIER_BADGE_CLASS } from '../constants/bases';
import { GAME_DATA_URL_PARAM_KEYS } from '../constants/urlParams';
import { formatRange, formatSocketCaps } from '../utils/format';

const DEFAULT_THRESHOLDS: ItemTypeInfo['thresholds'] = [25, 40];

interface BaseCardProps {
  readonly base: BaseItem;
  readonly typeByCode: ReadonlyMap<string, ItemTypeInfo>;
  readonly baseByCode: ReadonlyMap<string, BaseItem>;
  readonly classNames: ReadonlyMap<string, string>;
  /** Sets the page search (family links) */
  readonly onSearch: (text: string) => void;
}

function Stat({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

const FAMILY_LABELS = ['N', 'X', 'E'] as const;

export function BaseCard({ base, typeByCode, baseByCode, classNames, onSearch }: BaseCardProps) {
  const type = typeByCode.get(base.type);
  const type2 = base.type2 === null ? undefined : typeByCode.get(base.type2);
  const thresholds = type?.thresholds ?? DEFAULT_THRESHOLDS;

  const damage = [
    base.dmg1 && `1H ${formatRange(base.dmg1)}`,
    base.dmg2 && `2H ${formatRange(base.dmg2)}`,
    base.throwDmg && `Throw ${formatRange(base.throwDmg)}`,
  ].filter(Boolean);

  const requirements = [
    base.reqLvl > 0 && `Lvl ${String(base.reqLvl)}`,
    base.reqStr > 0 && `Str ${String(base.reqStr)}`,
    base.reqDex > 0 && `Dex ${String(base.reqDex)}`,
  ].filter(Boolean);

  const bonuses = [base.strBonus > 0 && `Str ${String(base.strBonus)}`, base.dexBonus > 0 && `Dex ${String(base.dexBonus)}`].filter(
    Boolean
  );

  // Self-referential families (accessories, mythicals) and blank members have nothing to link to
  const hasFamily = base.family.some((code) => code !== '' && code !== base.code);

  return (
    <Card className="h-full gap-3 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 text-lg">{base.name}</CardTitle>
          <Badge variant="outline" className={TIER_BADGE_CLASS[base.tier]}>
            {BASE_TIER_LABELS[base.tier]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <span>
            {type?.name ?? base.type}
            {type2 && ` / ${type2.name}`}
          </span>
          <span className="font-mono text-xs">({base.code})</span>
          {base.cls !== null && <Badge variant="secondary">{classNames.get(base.cls) ?? base.cls} only</Badge>}
          {base.autoGroup !== null && (
            <Badge variant="outline" title="Automagic affix group">
              Automod {base.autoGroup}
            </Badge>
          )}
          {base.indestructible && <Badge variant="outline">Indestructible</Badge>}
        </div>
      </CardHeader>

      <CardContent className="px-4">
        <dl className="space-y-0.5 text-sm">
          {damage.length > 0 && <Stat label="Damage">{damage.join(' · ')}</Stat>}
          {base.def !== null && <Stat label="Defense">{formatRange(base.def)}</Stat>}
          {base.block !== null && <Stat label="Block">{base.block}%</Stat>}
          {base.kind === 'weapon' && <Stat label="Speed">{base.speed}</Stat>}
          <Stat label="Required">{requirements.length > 0 ? requirements.join(' · ') : 'None'}</Stat>
          {bonuses.length > 0 && <Stat label="Dmg bonus">{bonuses.join(' · ')}</Stat>}
          <Stat label="Sockets">{formatSocketCaps(base.socketCaps, thresholds)}</Stat>
          <Stat label="Quality lvl">{base.qlvl}</Stat>
          {hasFamily && (
            <Stat label="Family">
              <span className="flex flex-wrap gap-x-2">
                {base.family.map((code, index) => {
                  if (code === '') return null;
                  const member = baseByCode.get(code);
                  const label = FAMILY_LABELS[index];
                  if (code === base.code) {
                    return (
                      <span key={label} className="font-medium">
                        {label}: {base.name}
                      </span>
                    );
                  }
                  if (member === undefined) {
                    return (
                      <span key={label} className="text-muted-foreground" title="Not a spawnable base">
                        {label}: {code}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={label}
                      type="button"
                      className="text-left text-primary underline-offset-2 hover:underline"
                      onClick={() => {
                        onSearch(`"${member.name}"`);
                      }}
                    >
                      {label}: {member.name}
                    </button>
                  );
                })}
              </span>
            </Stat>
          )}
        </dl>
        <Link
          to={`/game-data/affixes?${new URLSearchParams({ [GAME_DATA_URL_PARAM_KEYS.BASE]: base.code }).toString()}`}
          className="mt-2 inline-block text-sm text-primary underline-offset-2 hover:underline"
        >
          What can roll
        </Link>
      </CardContent>
    </Card>
  );
}
