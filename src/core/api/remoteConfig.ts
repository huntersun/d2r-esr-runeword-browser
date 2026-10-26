// Base URL for ESR documentation
export const ESR_BASE_URL = 'https://easternsunresurrected.com';

// ESR GitHub repository (`owner/name`) and its raw files on the main branch
export const ESR_REPO_SLUG = 'CelestialRayOne/Eastern_Sun_Resurrected';
export const ESR_REPO_RAW_URL = `https://raw.githubusercontent.com/${ESR_REPO_SLUG}/main`;

// Remote data URLs
export const REMOTE_URLS = {
  // Primary ESR version source: the mod launcher metadata (`metadata.modVersion`), bumped on every release
  modMetadata: `${ESR_REPO_RAW_URL}/d2rloader/metadata.json`,
  // Fallback version source: the first dated header on the changelog page (no new headers after 3.2.02)
  changelog: `${ESR_BASE_URL}/changelogs.html`,
  gems: `${ESR_BASE_URL}/gems.htm`,
  gemwords: `${ESR_BASE_URL}/gemwords.htm`,
  runewords: `${ESR_BASE_URL}/runewords.htm`,
  uniqueWeapons: `${ESR_BASE_URL}/unique_weapons.htm`,
  uniqueArmors: `${ESR_BASE_URL}/unique_armors.htm`,
  uniqueOthers: `${ESR_BASE_URL}/unique_others.htm`,
  uniqueMythicals: `${ESR_BASE_URL}/unique_mythicals.htm`,
  ascendancies: `${ESR_BASE_URL}/ascendancies.htm`,
} as const;
