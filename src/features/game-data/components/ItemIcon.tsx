import { cn } from '@/lib/utils';
import { gameDataUrl } from '../engine/browser/loadGameData';
import { useItemIcons } from '../hooks/useItemIcons';

interface ItemIconProps {
  /** Base item code */
  readonly code: string;
  /** Side of the square the icon fits in, in CSS pixels */
  readonly size: number;
  readonly className?: string;
}

/**
 * The item's HD art (from the ESR clone), fit inside a `size`×`size` square keeping its aspect ratio.
 * The square is always reserved (also while loading and for items with vanilla art, which have no icon), so names
 * line up and nothing shifts when the icons arrive.
 */
export function ItemIcon({ code, size, className }: ItemIconProps) {
  const icon = useItemIcons()?.[code];
  const scale = icon === undefined ? 0 : size / Math.max(icon.w, icon.h);
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {icon !== undefined && (
        <img
          src={gameDataUrl(`icons/${icon.file}`)}
          width={Math.max(1, Math.round(icon.w * scale))}
          height={Math.max(1, Math.round(icon.h * scale))}
          loading="lazy"
          decoding="async"
          alt=""
          draggable={false}
          className="max-h-full max-w-full drop-shadow-sm"
        />
      )}
    </span>
  );
}
