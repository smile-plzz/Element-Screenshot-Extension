/** Browsers block injection on internal pages and extension stores. */
export function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) return true;
    const host = parsed.hostname.toLowerCase();
    return host === 'chromewebstore.google.com' ||
      (host === 'chrome.google.com' && parsed.pathname.startsWith('/webstore')) ||
      host === 'addons.mozilla.org' || host === 'microsoftedge.microsoft.com' && parsed.pathname.startsWith('/addons');
  } catch { return true; }
}
