/**
 * Checks if a tab URL is restricted from extension script injection.
 * System URLs, extension stores, and internal browser schemes cannot be captured.
 */
export function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:') ||
    url.includes('chrome.google.com/webstore') ||
    url.includes('chromewebstore.google.com') ||
    url.includes('addons.mozilla.org')
  );
}
