import { describe, it, expect } from 'vitest';
import { isRestrictedUrl } from '../src/common/urls';

describe('restricted URLs validation', () => {
  it('blocks undefined or empty URLs', () => {
    expect(isRestrictedUrl(undefined)).toBe(true);
    expect(isRestrictedUrl('')).toBe(true);
  });

  it('blocks internal browser scheme URLs', () => {
    expect(isRestrictedUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedUrl('chrome://settings')).toBe(true);
    expect(isRestrictedUrl('chrome-extension://abcdefg/popup.html')).toBe(true);
    expect(isRestrictedUrl('edge://settings')).toBe(true);
    expect(isRestrictedUrl('about:config')).toBe(true);
    expect(isRestrictedUrl('about:debugging')).toBe(true);
    expect(isRestrictedUrl('view-source:https://example.com')).toBe(true);
  });

  it('blocks web extension store pages where scripting is disallowed', () => {
    expect(isRestrictedUrl('https://chrome.google.com/webstore/detail/xyz')).toBe(true);
    expect(isRestrictedUrl('https://chromewebstore.google.com/detail/xyz')).toBe(true);
    expect(isRestrictedUrl('https://addons.mozilla.org/en-US/firefox/addon/elementshot/')).toBe(true);
  });

  it('permits normal public and local web URLs', () => {
    expect(isRestrictedUrl('https://example.com')).toBe(false);
    expect(isRestrictedUrl('https://github.com/smile-plzz/Element-Screenshot-Extension')).toBe(false);
    expect(isRestrictedUrl('http://localhost:3000')).toBe(false);
    expect(isRestrictedUrl('http://127.0.0.1:8080/docs')).toBe(false);
  });
});
