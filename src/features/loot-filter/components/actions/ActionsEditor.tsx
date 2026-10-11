import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { resolveText } from '../../engine/text';
import { DEFAULT_LABEL_BACKGROUND_ALPHA, type LootFilter, type RuleActions } from '../../engine/types';
import { effectiveActions, findStyle, previewLabelText } from '../../utils/effectiveActions';
import type { ShallowPatch } from '../../utils/patch';
import { LabelPreview } from '../LabelPreview';
import { NumberInput } from '../NumberInput';
import { ColorControl } from './ColorControl';
import { ColorTextField } from './ColorTextField';
import { IconField } from './IconField';
import { SoundField } from './SoundField';
import { StyleSummary } from './StyleSummary';

export interface ActionsEditorProps {
  /** The actions being edited (a rule's own actions, or a style's). */
  readonly actions: RuleActions;
  /** Shallow patch: a key with `undefined` removes it. The caller dispatches `patchRule` or `setStyle`. */
  readonly onChange: (patch: ShallowPatch<RuleActions>) => void;
  /** The whole filter, for the style list (`useStyle`), the quality colours and the label preview. */
  readonly filter: LootFilter;
  /** `rule`: offers `useStyle` and previews the style's actions underneath; `style`: no `useStyle`. */
  readonly owner: 'rule' | 'style';
  /** Name of the style being edited (for the preview heading); unused for rules. */
  readonly styleName?: string;
}

const NO_STYLE = '__none';
const DEFAULT_DROP_FORMAT = '{qualityColor}{name}';

function Section({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

interface CheckFieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint: React.ReactNode;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

function CheckField({ id, label, hint, checked, onChange }: CheckFieldProps) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => {
          onChange(value === true);
        }}
      />
      <div className="grid min-w-0 gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/**
 * Form for every action key of the guide (names, label colours, chat, notify, sound, icon, droplight,
 * useStyle, hide…), shared by the rule editor and the Styles tab. Each control sends a shallow patch;
 * `passthrough` is never touched. A rule's `comment` belongs to the rule editor; a style's is edited here.
 */
export function ActionsEditor({ actions, onChange, filter, owner, styleName }: ActionsEditorProps) {
  const idPrefix = owner === 'style' ? `loot-filter-style-${(styleName ?? '').replace(/[^A-Za-z0-9_-]/g, '_')}` : 'loot-filter-rule';
  const id = (key: string) => `${idPrefix}-${key}`;
  const flag = (value: boolean) => (value ? true : undefined);

  const effective = owner === 'rule' ? effectiveActions(actions, filter) : actions;
  const style = owner === 'rule' ? findStyle(actions, filter) : undefined;
  const styleNames = Object.keys(filter.styles ?? {});
  const dropFormat = resolveText(filter.notifications?.dropFormat) ?? DEFAULT_DROP_FORMAT;
  const border = actions.labelBorder;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          Label preview
          {owner === 'style' && styleName !== undefined ? ` · ${styleName}` : ''}
          {style !== undefined ? ' (with the style)' : ''}
        </span>
        <LabelPreview
          text={effective.hide === true ? '' : previewLabelText(effective)}
          background={effective.labelBackground}
          border={effective.labelBorder}
          className="min-h-16"
        />
        <p className="text-xs text-muted-foreground">
          {effective.hide === true
            ? 'Hidden: the item shows no label.'
            : '{name} shows as "Item Name"; other placeholders as written. Without a colour code the game colours the name by quality.'}
        </p>
      </div>

      {owner === 'rule' && (
        <Section title="Style">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id('use-style')}>Use style</Label>
            <Select
              value={actions.useStyle ?? NO_STYLE}
              onValueChange={(value) => {
                onChange({ useStyle: value === NO_STYLE ? undefined : value });
              }}
            >
              <SelectTrigger id={id('use-style')} className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STYLE}>None</SelectItem>
                {actions.useStyle !== undefined && !styleNames.includes(actions.useStyle) && (
                  <SelectItem value={actions.useStyle}>{actions.useStyle} (missing)</SelectItem>
                )}
                {styleNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {actions.useStyle === undefined
                ? 'Pulls in a named set of actions from the Styles tab.'
                : style === undefined
                  ? `The filter has no style "${actions.useStyle}".`
                  : "The style's actions apply underneath; the rule's own actions win."}
            </p>
          </div>
          {style !== undefined && actions.useStyle !== undefined && <StyleSummary name={actions.useStyle} style={style} />}
        </Section>
      )}

      <Section title="Visibility">
        <div className="grid gap-4 sm:grid-cols-2">
          <CheckField
            id={id('hide')}
            label="Hide"
            hint="Hides the ground label; no later rule runs."
            checked={actions.hide === true}
            onChange={(value) => {
              onChange({ hide: flag(value) });
            }}
          />
          <CheckField
            id={id('hide-if-other-fail')}
            label="Hide if other conditions fail"
            hint="When codes, types and location match but another condition fails, the item is hidden."
            checked={actions.hideIfOtherConditionsFail === true}
            onChange={(value) => {
              onChange({ hideIfOtherConditionsFail: flag(value) });
            }}
          />
        </div>
        <ColorTextField
          id={id('chat-when-hidden')}
          label="Chat line when hidden"
          context="chat"
          defaultColor="0"
          value={actions.chatMessageWhenHidden}
          placeholder="ÿc5Hidden: {name}"
          hint="Printed when this rule hides the item."
          onChange={(chatMessageWhenHidden) => {
            onChange({ chatMessageWhenHidden });
          }}
        />
      </Section>

      <Section title="Name">
        <ColorTextField
          id={id('replace-name')}
          label="Replace name"
          context="names"
          value={actions.replaceName}
          placeholder="{name}"
          hint="A new name; {name} is the game's own."
          onChange={(replaceName) => {
            onChange({ replaceName });
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorTextField
            id={id('name-prefix')}
            label="Prefix"
            context="names"
            value={actions.namePrefix}
            placeholder="ÿc1* "
            onChange={(namePrefix) => {
              onChange({ namePrefix });
            }}
          />
          <ColorTextField
            id={id('name-suffix')}
            label="Suffix"
            context="names"
            value={actions.nameSuffix}
            placeholder=" ({sockets})"
            onChange={(nameSuffix) => {
              onChange({ nameSuffix });
            }}
          />
        </div>
      </Section>

      <Section title="Label">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id('label-background')}>Background</Label>
            <ColorControl
              id={id('label-background')}
              label="label background"
              value={actions.labelBackground}
              withAlpha
              defaultAlpha={DEFAULT_LABEL_BACKGROUND_ALPHA}
              initialColor={[0, 0, 0]}
              onChange={(labelBackground) => {
                onChange({ labelBackground });
              }}
            />
            <p className="text-xs text-muted-foreground">Fills the ground label; alpha defaults to {DEFAULT_LABEL_BACKGROUND_ALPHA}.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id('label-border')}>Border</Label>
            {border === undefined ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">none</span>
                <Button
                  id={id('label-border')}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange({ labelBorder: { color: [255, 255, 255], width: 1 } });
                  }}
                >
                  <Plus />
                  Add border
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <ColorControl
                    id={id('label-border')}
                    label="border colour"
                    value={border.color}
                    withAlpha
                    clearable={false}
                    onChange={(color) => {
                      if (color) onChange({ labelBorder: { ...border, color } });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove the border"
                    onClick={() => {
                      onChange({ labelBorder: undefined });
                    }}
                  >
                    <X />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={id('label-border-width')} className="text-xs font-normal text-muted-foreground">
                    Width
                  </Label>
                  <NumberInput
                    id={id('label-border-width')}
                    className="w-20"
                    min={0}
                    value={border.width}
                    onCommit={(width) => {
                      onChange({ labelBorder: { ...border, width: width ?? 0 } });
                    }}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Outlines the ground label.</p>
          </div>
        </div>
      </Section>

      <Section title="Chat">
        <ColorTextField
          id={id('chat-message')}
          label="Chat line"
          context="chat"
          defaultColor="0"
          value={actions.chatMessage}
          placeholder="ÿc4Drop: {link}"
          hint="Printed when the item drops; replaces the drop line of notify."
          onChange={(chatMessage) => {
            onChange({ chatMessage });
          }}
        />
        <CheckField
          id={id('notify')}
          label="Notify"
          hint={
            <>
              Prints the filter&apos;s drop line: <code className="break-all">{dropFormat}</code>
              {effective.chatMessage !== undefined ? ' (the chat line above replaces it).' : '.'}
            </>
          }
          checked={actions.notify === true}
          onChange={(value) => {
            onChange({ notify: flag(value) });
          }}
        />
      </Section>

      <Section title="Sound">
        <SoundField
          idPrefix={idPrefix}
          sound={actions.sound}
          soundVolume={actions.soundVolume}
          filterVolume={filter.soundVolume}
          onSoundChange={(sound) => {
            onChange({ sound });
          }}
          onVolumeChange={(soundVolume) => {
            onChange({ soundVolume });
          }}
        />
      </Section>

      <Section title="Minimap icon">
        <IconField
          idPrefix={idPrefix}
          icon={actions.icon}
          onChange={(icon) => {
            onChange({ icon });
          }}
        />
      </Section>

      <Section title="Droplight">
        <CheckField
          id={id('droplight')}
          label="Droplight"
          hint="A beam of light with a sparkle on the item. HD graphics only."
          checked={actions.droplight !== undefined}
          onChange={(value) => {
            onChange({ droplight: value ? {} : undefined });
          }}
        />
        {actions.droplight !== undefined && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id('droplight-color')}>Tint</Label>
            <ColorControl
              id={id('droplight-color')}
              label="droplight tint"
              value={actions.droplight.color}
              noneLabel="the effect's own colours"
              onChange={(color) => {
                onChange({ droplight: color === undefined ? {} : { color: [color[0], color[1], color[2]] } });
              }}
            />
          </div>
        )}
      </Section>

      {owner === 'style' && (
        <Section title="Comment">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id('comment')} className="sr-only">
              Comment
            </Label>
            <Textarea
              id={id('comment')}
              rows={2}
              value={actions.comment ?? ''}
              placeholder="Notes for yourself; the plugin ignores them."
              onChange={(event) => {
                onChange({ comment: event.target.value === '' ? undefined : event.target.value });
              }}
            />
          </div>
        </Section>
      )}
    </div>
  );
}
