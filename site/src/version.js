// App version comes from root package.json via Vite define (__APP_VERSION__).
// Display + GitHub release tag both use the same string with a leading v.
// Pass through as-is: "2.0.0" → v2.0.0, "2.1.0-beta.1" → v2.1.0-beta.1.

export const APP_VERSION = __APP_VERSION__;

const GITHUB_REPO = 'BurntToasters/ROSIE-WRITE';

export function versionLabel() {
  return `v${APP_VERSION}`;
}

export function releaseTag() {
  return versionLabel();
}

export function releaseUrl() {
  return `https://github.com/${GITHUB_REPO}/releases/tag/${encodeURIComponent(releaseTag())}`;
}

/** Set text + href on every `.version-indicator` in `root`. */
export function bindVersionIndicator(root = document) {
  const label = versionLabel();
  const url = releaseUrl();
  for (const el of root.querySelectorAll('.version-indicator')) {
    el.textContent = label;
    if (el instanceof HTMLAnchorElement) el.href = url;
  }
}
