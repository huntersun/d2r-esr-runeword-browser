import { REMOTE_URLS } from './remoteConfig';

export async function fetchUniqueWeaponsHtml(): Promise<string> {
  const response = await fetch(REMOTE_URLS.uniqueWeapons);

  if (!response.ok) {
    throw new Error(`Failed to fetch unique_weapons.htm: ${String(response.status)} ${response.statusText}`);
  }

  return response.text();
}

export async function fetchUniqueArmorsHtml(): Promise<string> {
  const response = await fetch(REMOTE_URLS.uniqueArmors);

  if (!response.ok) {
    throw new Error(`Failed to fetch unique_armors.htm: ${String(response.status)} ${response.statusText}`);
  }

  return response.text();
}

export async function fetchUniqueOthersHtml(): Promise<string> {
  const response = await fetch(REMOTE_URLS.uniqueOthers);

  if (!response.ok) {
    throw new Error(`Failed to fetch unique_others.htm: ${String(response.status)} ${response.statusText}`);
  }

  return response.text();
}
