import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LabelColor, MinimapIcon } from '../../engine/types';
import { BUNDLED_ICONS } from '../../utils/bundledAssets';
import { applyPatch } from '../../utils/patch';
import { NumberInput } from '../NumberInput';
import { ColorControl } from './ColorControl';
import { SpritePreview } from './SpritePreview';

interface IconFieldProps {
  readonly idPrefix: string;
  readonly icon: MinimapIcon | undefined;
  readonly onChange: (icon: MinimapIcon | undefined) => void;
}

/** The `icon` action: on/off, file name, size, tint and a preview of the sprite. */
export function IconField({ idPrefix, icon, onChange }: IconFieldProps) {
  const enabledId = `${idPrefix}-icon`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Checkbox
          id={enabledId}
          checked={icon !== undefined}
          onCheckedChange={(checked) => {
            onChange(checked === true ? { iconName: BUNDLED_ICONS[0] } : undefined);
          }}
        />
        <div className="grid gap-1">
          <Label htmlFor={enabledId}>Minimap icon</Label>
          <p className="text-xs text-muted-foreground">Drawn on the minimap where the item lies. HD graphics only.</p>
        </div>
      </div>
      {icon && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-icon-name`}>Icon file</Label>
            <Input
              id={`${idPrefix}-icon-name`}
              className="font-mono"
              value={icon.iconName}
              list={`${idPrefix}-icon-names`}
              autoComplete="off"
              onChange={(event) => {
                onChange({ ...icon, iconName: event.target.value });
              }}
            />
            <datalist id={`${idPrefix}-icon-names`}>
              {BUNDLED_ICONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">A .sprite in the filter&apos;s icons folder; .sprite may be left off.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-icon-size`}>Size</Label>
            <NumberInput
              id={`${idPrefix}-icon-size`}
              className="w-28"
              integer
              min={4}
              max={256}
              placeholder="file size"
              value={icon.iconSize}
              onCommit={(iconSize) => {
                onChange(applyPatch(icon, { iconSize }));
              }}
            />
            <p className="text-xs text-muted-foreground">4 to 256: the longer side in minimap pixels; blank = the file&apos;s own size.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-icon-color`}>Tint</Label>
            <ColorControl
              id={`${idPrefix}-icon-color`}
              label="icon tint"
              value={icon.color}
              withAlpha
              noneLabel="none (the file's colours)"
              onChange={(color: LabelColor | undefined) => {
                onChange(applyPatch(icon, { color }));
              }}
            />
            <p className="text-xs text-muted-foreground">Multiplies the icon&apos;s colours; alpha fades it.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Preview</span>
            <SpritePreview idPrefix={idPrefix} iconName={icon.iconName} iconSize={icon.iconSize} color={icon.color} />
          </div>
        </div>
      )}
    </div>
  );
}
