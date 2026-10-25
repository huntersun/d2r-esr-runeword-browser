import { REMOTE_URLS } from './remoteConfig';

export type EsrVersionSource = 'modMetadata' | 'changelog';

export interface EsrVersionInfo {
  readonly version: string; // "3.2.24", "3.12" or "3.9.09"
  readonly source: EsrVersionSource;
  /** Release date as written in the changelog header ("22/12/2025"); null for the metadata source. */
  readonly date: string | null;
}

// "3.2.24" or "3.12": two or three numeric parts
const VERSION_FORMAT = /^\d+\.\d+(?:\.\d+)?$/;

// Changelog header, e.g. "Eastern Sun Resurrected 3.9.09 - 22/12/2025".
// The patch component is optional: releases are published as either "3.11.09" or "3.12".
const CHANGELOG_VERSION_PATTERN = /Eastern\s+Sun\s+Resurrected\s+(\d+\.\d+(?:\.\d+)?)\s+-\s+(\d{2}\/\d{2}\/\d{4})/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads `metadata.modVersion` from the ESR launcher metadata (d2rloader/metadata.json on GitHub). */
async function fetchModMetadataVersion(): Promise<EsrVersionInfo> {
  const response = await fetch(REMOTE_URLS.modMetadata);

  if (!response.ok) {
    throw new Error(`Failed to fetch mod metadata: ${String(response.status)} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  const metadata = isRecord(json) ? json.metadata : undefined;
  const modVersion = isRecord(metadata) ? metadata.modVersion : undefined;

  if (typeof modVersion !== 'string' || !VERSION_FORMAT.test(modVersion.trim())) {
    throw new Error('Could not parse modVersion from mod metadata');
  }

  return { version: modVersion.trim(), source: 'modMetadata', date: null };
}

/** Fallback: the first dated header on the docs site's changelog page. */
async function fetchChangelogVersion(): Promise<EsrVersionInfo> {
  const response = await fetch(REMOTE_URLS.changelog);

  if (!response.ok) {
    throw new Error(`Failed to fetch changelog: ${String(response.status)} ${response.statusText}`);
  }

  const html = await response.text();
  const match = CHANGELOG_VERSION_PATTERN.exec(html);

  if (!match) {
    throw new Error('Could not parse version from changelog');
  }

  return { version: match[1], source: 'changelog', date: match[2] };
}

/**
 * The latest ESR release version. The primary source is the mod's launcher metadata on GitHub.
 * The docs site's changelog stopped getting dated headers after 3.2.02, so it is only a
 * fallback for when the metadata cannot be fetched or parsed. Throws when both fail.
 */
export async function fetchLatestVersion(): Promise<EsrVersionInfo> {
  try {
    const info = await fetchModMetadataVersion();
    console.log('[Version] ESR version from mod metadata (d2rloader/metadata.json):', info.version);
    return info;
  } catch (metadataError) {
    console.warn('[Version] Mod metadata unavailable, falling back to the changelog page:', metadataError);
  }

  try {
    const info = await fetchChangelogVersion();
    console.log('[Version] ESR version from the changelog page (fallback):', info.version);
    return info;
  } catch (changelogError) {
    console.warn('[Version] Changelog fallback failed too:', changelogError);
    throw new Error('Could not determine the ESR version from the mod metadata or the changelog', { cause: changelogError });
  }
}
