import { lootFilterAssetUrl } from './template';

/**
 * The sound and icon files shipped with the ESR default filter template under `public/loot-filters/`. The editor can
 * preview these; any other file lives only in the user's own filter folder.
 */

export const BUNDLED_SOUNDS = [
  'gong.mp3',
  'map.mp3',
  'mid.mp3',
  'mythical.mp3',
  'other.mp3',
  't5_map.mp3',
  'tink.mp3',
  'tinkLOUD.mp3',
  'unique.mp3',
] as const;

/** Icon names as a filter writes them (`iconName`, without `.sprite`). */
export const BUNDLED_ICONS = ['goldstar'] as const;

/** The bundled sound file a `sound` value names (the plugin's file names are case-insensitive), or undefined. */
export function findBundledSound(sound: string | number | undefined): string | undefined {
  if (typeof sound !== 'string') return undefined;
  const lower = sound.trim().toLowerCase();
  return BUNDLED_SOUNDS.find((name) => name.toLowerCase() === lower);
}

/** The bundled icon an `iconName` names, with or without `.sprite` and in any case, or undefined. */
export function findBundledIcon(iconName: string | undefined): string | undefined {
  if (iconName === undefined) return undefined;
  const lower = iconName
    .trim()
    .toLowerCase()
    .replace(/\.sprite$/, '');
  return BUNDLED_ICONS.find((name) => name.toLowerCase() === lower);
}

export function bundledSoundUrl(name: string): string {
  return lootFilterAssetUrl(`sounds/${encodeURIComponent(name)}`);
}

export function bundledIconUrl(name: string): string {
  return lootFilterAssetUrl(`icons/${encodeURIComponent(name)}.sprite`);
}

/** A `sound` value for display: a name as written, a number as its sounds.txt row (with the row's name when known). */
export function soundLabel(sound: string | number, soundNames: readonly string[]): string {
  if (typeof sound === 'string') return sound;
  const name = sound >= 0 ? (soundNames.at(sound) ?? '') : '';
  return name === '' ? `sounds.txt row ${String(sound)}` : `sounds.txt row ${String(sound)} (${name})`;
}
