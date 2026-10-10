import { useSelector } from 'react-redux';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import type { Gemword, HtmUniqueItem, MythicalUnique, Runeword } from '@/core/db';
import { selectError, selectIsInitialized } from '@/core/store';
import { useItemSources } from '@/features/game-data/hooks/useItemSources';
import { GemwordCard, useGemBonusMap } from '@/features/gemwords';
import { HtmUniqueItemCard } from '@/features/htm-unique-items';
import { MythicalUniqueCard } from '@/features/mythical-uniques';
import { RunewordCard } from '@/features/runewords';
// Not exported from the socketables feature index (only the screen is), so imported by its file path.
import { SocketableCard } from '@/features/socketables/components/SocketableCard';
import type { UnifiedSocketable } from '@/features/socketables/types';
import type { DataBlock } from '../engine/schema';
import { findCardRecord, findSocketable, pickCardVariants } from '../utils/cardRecord';
import { AppLinkIcon } from './AppLinkIcon';
import { GuideCardAppLink, GuideCardFailed, GuideCardLoading, GuideCardNotice } from './GuideCardPlaceholder';

export type CardBlock = Extract<DataBlock, { kind: 'card' }>;

type CardRecord =
  | { readonly item: 'runeword'; readonly records: readonly Runeword[] }
  | { readonly item: 'gemword'; readonly records: readonly Gemword[] }
  | { readonly item: 'unique'; readonly record: HtmUniqueItem }
  | { readonly item: 'mythical'; readonly record: MythicalUnique }
  | { readonly item: 'socketable'; readonly record: UnifiedSocketable };

/** Looks the block's item up in the local HTM data; null when it is not there (yet). */
async function resolveCard(item: CardBlock['item'], name: string): Promise<CardRecord | null> {
  switch (item) {
    case 'runeword': {
      const records = pickCardVariants(await db.runewords.toArray(), name);
      return records.length > 0 ? { item, records } : null;
    }
    case 'gemword': {
      const records = pickCardVariants(await db.gemwords.toArray(), name);
      return records.length > 0 ? { item, records } : null;
    }
    case 'unique': {
      const record = findCardRecord(await db.htmUniqueItems.toArray(), name);
      return record ? { item, record } : null;
    }
    case 'mythical': {
      const record = findCardRecord(await db.mythicalUniques.toArray(), name);
      return record ? { item, record } : null;
    }
    case 'socketable': {
      const [gems, esrRunes, lodRunes, kanjiRunes, crystals] = await Promise.all([
        db.gems.toArray(),
        db.esrRunes.toArray(),
        db.lodRunes.toArray(),
        db.kanjiRunes.toArray(),
        db.crystals.toArray(),
      ]);
      const record = findSocketable({ gems, esrRunes, lodRunes, kanjiRunes, crystals }, name);
      return record ? { item, record } : null;
    }
  }
}

function GemwordCards({ records }: { readonly records: readonly Gemword[] }) {
  const gemBonusMap = useGemBonusMap();
  return records.map((gemword) => <GemwordCard key={gemword.variant} gemword={gemword} gemBonusMap={gemBonusMap} />);
}

function SourcedCard({ record }: { readonly record: Exclude<CardRecord, { records: unknown }> }) {
  const { index: sourceIndex } = useItemSources();
  switch (record.item) {
    case 'unique':
      return <HtmUniqueItemCard item={record.record} sourceIndex={sourceIndex} />;
    case 'mythical':
      return <MythicalUniqueCard item={record.record} sourceIndex={sourceIndex} />;
    case 'socketable':
      return <SocketableCard socketable={record.record} sourceIndex={sourceIndex} />;
  }
}

function RecordCards({ record }: { readonly record: CardRecord }) {
  switch (record.item) {
    case 'runeword':
      return record.records.map((runeword) => <RunewordCard key={runeword.variant} runeword={runeword} />);
    case 'gemword':
      return <GemwordCards records={record.records} />;
    default:
      return <SourcedCard record={record} />;
  }
}

/**
 * An item card embedded in a guide note: the same card as the browse screens, resolved by name from the viewer's
 * local HTM data. Guide routes render before the first data sync finishes, so until the sync is initialised a
 * missing item shows a loading placeholder (the live query re-runs as the sync writes the tables); if that sync fails
 * (nothing cached, fetch/parse/store error) it shows a "could not be loaded" box with the app link instead.
 */
// Default export for lazy() in GuideBody (the cards and their data hooks stay out of the guide chunk).
export default function GuideItemCard({ block }: { readonly block: CardBlock }) {
  const isInitialized = useSelector(selectIsInitialized);
  const syncError = useSelector(selectError);
  // isInitialized is a dependency too, so the lookup re-runs once the sync reports done even if no write was observed.
  const record = useLiveQuery(() => resolveCard(block.item, block.name), [block.item, block.name, isInitialized]);
  const appLink = <GuideCardAppLink href={block.href} />;

  // Not found while the first sync has failed (it never initialises then): stop spinning and offer the app link.
  if (record == null && !isInitialized && syncError !== null) {
    return <GuideCardFailed name={block.name} href={block.href} />;
  }

  if (record === undefined || (record === null && !isInitialized)) {
    return <GuideCardLoading name={block.name} />;
  }

  if (record === null) {
    return (
      <GuideCardNotice>
        <span>
          <span className="font-medium text-foreground">{block.name}</span> is not in the current data.
        </span>
        {appLink}
      </GuideCardNotice>
    );
  }

  return (
    <figure className="space-y-2 rounded-md border p-2" aria-label={block.name}>
      <figcaption className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold tracking-wide uppercase">
          <AppLinkIcon href={block.href} className="size-3.5 shrink-0" />
          <span className="truncate">{block.item}</span>
        </span>
        {appLink}
      </figcaption>
      <RecordCards record={record} />
    </figure>
  );
}
