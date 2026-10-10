/**
 * Reads the uniques named by the D2RLoader plugin config `celestialrayone.boss-set-unique-drop.toml`
 * (`unique = "Hellfire Torch"` lines of `[[boss_set_unique_drop.rule]]` blocks). A tiny regex instead of a TOML parser:
 * the file is hand-written by the mod author in one fixed shape.
 */
export function readPluginUniques(toml: string | null): Set<string> {
  if (toml === null || /^\s*enabled\s*=\s*false\b/m.test(toml)) return new Set();
  const uniques = new Set<string>();
  for (const match of toml.matchAll(/^\s*unique\s*=\s*(["'])(.*?)\1/gm)) {
    const name = match[2];
    if (name !== '') uniques.add(name);
  }
  return uniques;
}
