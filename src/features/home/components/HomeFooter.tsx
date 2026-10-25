import appVersion from '@/assets/version.json';
import { ESR_DOCS_URL, GITHUB_URL, PRIVACY_POLICY_URL } from '@/core/navigation/navConfig';

const LINK_CLASS = 'underline-offset-2 hover:text-foreground hover:underline';

const FOOTER_LINKS = [
  { key: 'esr', href: ESR_DOCS_URL, label: 'Eastern Sun Resurrected' },
  { key: 'github', href: GITHUB_URL, label: 'GitHub' },
  { key: 'privacy', href: PRIVACY_POLICY_URL, label: 'Privacy policy' },
] as const;

/** Home page footer: app version, external links and credits. */
export function HomeFooter() {
  return (
    <footer className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        <li>App version {appVersion.version}</li>
        {FOOTER_LINKS.map((link) => (
          <li key={link.key}>
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <p>
        Eastern Sun Resurrected by Celestialray. This is an unofficial fan site; game data comes from the ESR documentation and game files.
      </p>
      <p>Item art © Blizzard Entertainment and the Eastern Sun Resurrected team, used with permission.</p>
    </footer>
  );
}
