import { Plus, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { LabelColor } from '../../engine/types';
import { colorAlpha, colorToHex, formatColor, hexToRgb, withAlpha, withRgb } from '../../utils/colorValues';

interface ColorControlProps {
  readonly id: string;
  /** Accessible name of the control (the visible label lives with the caller). */
  readonly label: string;
  readonly value: LabelColor | undefined;
  /** The new colour, or undefined for "clear". */
  readonly onChange: (value: LabelColor | undefined) => void;
  /** Offer the alpha slider (`[r, g, b, a]`). */
  readonly withAlpha?: boolean;
  /** The alpha the plugin uses when the colour has none (shown on the slider). Default 255. */
  readonly defaultAlpha?: number;
  /** What an unset colour means, e.g. "none" or "the effect's own colours". */
  readonly noneLabel?: string;
  /** The colour "Set" starts from. Default white. */
  readonly initialColor?: LabelColor;
  /** Hide the clear button (the caller offers its own remove). */
  readonly clearable?: boolean;
}

const CHECKERBOARD = 'repeating-conic-gradient(#888 0% 25%, #ccc 0% 50%) 50% / 8px 8px';

/** `[r, g, b]` / `[r, g, b, a]` picker: native colour input, optional alpha slider, numeric readout and clear. */
export function ColorControl({
  id,
  label,
  value,
  onChange,
  withAlpha: alphaEnabled = false,
  defaultAlpha = 255,
  noneLabel = 'none',
  initialColor = [255, 255, 255],
  clearable = true,
}: ColorControlProps) {
  if (value === undefined) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{noneLabel}</span>
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Set ${label}`}
          onClick={() => {
            onChange(initialColor);
          }}
        >
          <Plus />
          Set colour
        </Button>
      </div>
    );
  }

  const alpha = colorAlpha(value);
  const shownAlpha = alpha ?? defaultAlpha;
  const swatch = `rgba(${String(value[0])}, ${String(value[1])}, ${String(value[2])}, ${String(alphaEnabled ? shownAlpha / 255 : 1)})`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className="relative inline-block size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs focus-within:ring-[3px] focus-within:ring-ring/50"
          style={{ background: CHECKERBOARD }}
        >
          <span className="absolute inset-0" style={{ backgroundColor: swatch }} aria-hidden />
          <input
            id={id}
            type="color"
            aria-label={label}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            value={colorToHex(value)}
            onChange={(event) => {
              const rgb = hexToRgb(event.target.value);
              if (rgb) onChange(withRgb(value, rgb));
            }}
          />
        </label>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">[{formatColor(value)}]</code>
        {clearable && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Clear ${label}`}
            onClick={() => {
              onChange(undefined);
            }}
          >
            <X />
          </Button>
        )}
      </div>
      {alphaEnabled && (
        <div className="flex max-w-xs items-center gap-2">
          <span className="w-10 shrink-0 text-xs text-muted-foreground">Alpha</span>
          <Slider
            min={0}
            max={255}
            step={1}
            value={[shownAlpha]}
            thumbProps={{ 'aria-label': `${label} alpha` }}
            onValueChange={(values) => {
              const next = values.at(0);
              if (next !== undefined) onChange(withAlpha(value, next));
            }}
          />
          <span className={cn('w-16 shrink-0 text-right font-mono text-xs', alpha === undefined && 'text-muted-foreground')}>
            {alpha === undefined ? `${String(defaultAlpha)} (def.)` : String(alpha)}
          </span>
          {alpha !== undefined && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Reset ${label} alpha to the default`}
              title={`Back to the default (${String(defaultAlpha)})`}
              onClick={() => {
                onChange(withAlpha(value, undefined));
              }}
            >
              <RotateCcw />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
