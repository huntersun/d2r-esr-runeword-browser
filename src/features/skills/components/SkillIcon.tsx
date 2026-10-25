import { useState } from 'react';
import { cn } from '@/lib/utils';
import { gameDataUrl } from '@/features/game-data/engine/browser/loadGameData';

interface SkillIconProps {
  /** skilldetails.json `icon` key (`so-0`, `gen-90`); undefined renders the empty frame */
  readonly icon: string | undefined;
  /** Side in CSS pixels; the square is reserved while the image loads */
  readonly size: number;
  readonly dimmed?: boolean;
  readonly className?: string;
}

/** The skill's HD icon cel (icons/skills/<key>.webp), or an empty framed square when it has none or fails to load. */
export function SkillIcon({ icon, size, dimmed = false, className }: SkillIconProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const show = icon !== undefined && failed !== icon;
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted', className)}
      style={{ width: size, height: size }}
    >
      {show && (
        <img
          src={gameDataUrl(`icons/skills/${icon}.webp`)}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          alt=""
          draggable={false}
          className={cn('size-full', dimmed && 'opacity-40 grayscale')}
          onError={() => {
            setFailed(icon);
          }}
        />
      )}
    </span>
  );
}
