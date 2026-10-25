import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { SkillDetail, SkillGrant } from '@/features/game-data/engine/schema';
import { cn } from '@/lib/utils';
import {
  dependents,
  descriptionParagraphs,
  formatMana,
  GRANT_GROUPS,
  grantText,
  ITEM_KIND_LABELS,
  itemPageUrl,
  keyed,
  skillContext,
  type SkillsView,
} from '../utils/skills';
import { SkillIcon } from './SkillIcon';

/** Grants shown per group before "Show all" */
const GRANTS_SHOWN = 8;

const LINK = 'font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary';
const KIND_CLASS: Record<string, string> = {
  unique: 'text-amber-700 dark:text-amber-400',
  set: 'text-green-700 dark:text-green-400',
  runeword: 'text-yellow-700 dark:text-yellow-300',
  gemword: 'text-sky-700 dark:text-sky-300',
};

interface SkillDetailCardProps {
  readonly view: SkillsView;
  readonly skill: SkillDetail;
  readonly mythicals: ReadonlySet<string>;
  readonly onSelect: (id: string) => void;
  readonly onClose: () => void;
  readonly className?: string;
}

/** Everything the files say about one skill: scalars, description, synergies and the items that grant it. */
export function SkillDetailCard({ view, skill, mythicals, onSelect, onClose, className }: SkillDetailCardProps) {
  const unlocks = dependents(view, skill.id);
  const facts = [
    skill.cls === null ? null : `Required level ${String(skill.reqLevel)}`,
    `Max level ${String(skill.maxLevel)}`,
    skill.mana === undefined ? null : `Mana ${formatMana(skill.mana)}`,
    skill.element === undefined ? null : `${skill.element} damage`,
    skill.type === 'aura' ? 'Aura' : skill.type === 'passive' ? 'Passive' : null,
  ].filter((fact) => fact !== null);

  return (
    <article aria-label={skill.name} className={cn('space-y-4 rounded-lg border bg-card p-4 text-sm', className)}>
      <header className="flex items-start gap-3">
        <SkillIcon icon={skill.icon} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-tight font-semibold">{skill.name}</h2>
          <p className="text-xs text-muted-foreground">{skillContext(view, skill)}</p>
          {skill.id !== skill.name && <p className="text-xs text-muted-foreground">skills.txt: {skill.id}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close skill details"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>

      <ul className="flex flex-wrap gap-1.5">
        {facts.map((fact) => (
          <li key={fact} className="rounded-full border bg-background px-2 py-0.5 text-xs">
            {fact}
          </li>
        ))}
      </ul>

      {skill.description.length > 0 && (
        <div className="space-y-0.5">
          {keyed(descriptionParagraphs(skill.description), String).map(({ key, value }) => (
            <p key={key}>{value}</p>
          ))}
        </div>
      )}

      {skill.lines !== undefined && (
        <ul className="space-y-0.5 text-blue-700 dark:text-blue-300">
          {keyed(skill.lines, String).map(({ key, value }) => (
            <li key={key} className="whitespace-pre-line">
              {value}
            </li>
          ))}
        </ul>
      )}

      {(skill.reqSkills !== undefined || unlocks.length > 0) && (
        <div className="space-y-1">
          {skill.reqSkills !== undefined && (
            <p>
              <span className="text-muted-foreground">Requires: </span>
              <SkillLinks view={view} ids={skill.reqSkills} onSelect={onSelect} />
            </p>
          )}
          {unlocks.length > 0 && (
            <p>
              <span className="text-muted-foreground">Unlocks: </span>
              <SkillLinks view={view} ids={unlocks.map((entry) => entry.id)} onSelect={onSelect} />
            </p>
          )}
        </div>
      )}

      {skill.synergies !== undefined && (
        <section className="space-y-1">
          <h3 className="font-semibold">Receives bonuses from</h3>
          <ul className="space-y-0.5">
            {keyed(skill.synergies, (synergy) => `${synergy.name}:${synergy.text ?? ''}`).map(({ key, value: synergy }) => {
              const target = view.byId.get(synergy.id ?? synergy.name);
              return (
                <li key={key}>
                  {target === undefined ? (
                    <span className="font-medium">{synergy.name}</span>
                  ) : (
                    <button
                      type="button"
                      className={LINK}
                      onClick={() => {
                        onSelect(target.id);
                      }}
                    >
                      {synergy.name}
                    </button>
                  )}
                  {synergy.text !== undefined && <span className="text-muted-foreground">: {synergy.text}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {skill.notes !== undefined && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {keyed(skill.notes, String).map(({ key, value }) => (
            <li key={key} className="whitespace-pre-line">
              {value}
            </li>
          ))}
        </ul>
      )}

      <GrantedBy view={view} grants={skill.grantedBy ?? []} mythicals={mythicals} />
    </article>
  );
}

function SkillLinks({
  view,
  ids,
  onSelect,
}: {
  readonly view: SkillsView;
  readonly ids: readonly string[];
  readonly onSelect: (id: string) => void;
}) {
  return (
    <>
      {ids.map((id, i) => {
        const target = view.byId.get(id);
        return (
          <span key={id}>
            {i > 0 && ', '}
            {target === undefined ? (
              id
            ) : (
              <button
                type="button"
                className={LINK}
                onClick={() => {
                  onSelect(id);
                }}
              >
                {target.name}
              </button>
            )}
          </span>
        );
      })}
    </>
  );
}

function GrantedBy({
  view,
  grants,
  mythicals,
}: {
  readonly view: SkillsView;
  readonly grants: readonly SkillGrant[];
  readonly mythicals: ReadonlySet<string>;
}) {
  if (grants.length === 0) {
    return <p className="text-xs text-muted-foreground">No unique, set item or runeword grants this skill.</p>;
  }
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">
        Granted by <span className="font-normal text-muted-foreground">({String(grants.length)})</span>
      </h3>
      {GRANT_GROUPS.map((group) => {
        const hows: readonly string[] = group.hows;
        const entries = grants.filter((grant) => hows.includes(grant.how));
        if (entries.length === 0) return null;
        return <GrantGroup key={group.key} label={group.label} view={view} grants={entries} mythicals={mythicals} />;
      })}
    </section>
  );
}

function GrantGroup({
  label,
  view,
  grants,
  mythicals,
}: {
  readonly label: string;
  readonly view: SkillsView;
  readonly grants: readonly SkillGrant[];
  readonly mythicals: ReadonlySet<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? grants : grants.slice(0, GRANTS_SHOWN);
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label} ({String(grants.length)})
      </h4>
      <ul className="space-y-1">
        {keyed(shown, (grant) => JSON.stringify(grant)).map(({ key, value: grant }) => {
          const item = view.items.at(grant.item);
          if (item === undefined) return null;
          return (
            <li key={key} className="leading-snug">
              <Link
                to={itemPageUrl(item, mythicals)}
                className={cn('font-medium underline-offset-2 hover:underline', KIND_CLASS[item.kind])}
              >
                {item.name}
              </Link>
              <span className="text-xs text-muted-foreground"> · {ITEM_KIND_LABELS[item.kind]}</span>
              <div className="text-xs">{grantText(grant)}</div>
            </li>
          );
        })}
      </ul>
      {grants.length > GRANTS_SHOWN && (
        <button
          type="button"
          className={cn(LINK, 'text-xs')}
          onClick={() => {
            setExpanded((value) => !value);
          }}
        >
          {expanded ? 'Show fewer' : `Show all ${String(grants.length)}`}
        </button>
      )}
    </div>
  );
}
