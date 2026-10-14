# Verification

## Automated checks

Run `npm ci` and `npm run verify` on Node 22+. This type-checks TypeScript, runs unit and DOM behavior tests, builds both browser packages and creates versioned archives. `npm run test:e2e` requires `CHROME_PATH` pointing to Chrome for Testing or Chromium. Set `HEADED=1` for a visible browser.

The browser test loads a real extension and checks the service worker capture/crop, PNG clipboard pixels at 2x, a download, selection locking, Enter capture, click suppression, cleanup and options validation. It uses a temporary copy of the manifest with test-only host access to drive injection deterministically. Production packages have no host permissions. Toolbar/shortcut activeTab granting still requires a manual check.

The 40-test local suite covers rectangle math, filenames, safe paths, settings, restricted URLs, worker encoding, screenshot scaling, and actual Picker DOM behavior. The previous label-only test copied implementation logic and has been replaced by real picker tests.

## Local verification record

- Type checking, 40 tests, build and archive generation: passed on 2026-10-15 (Dhaka).
- Loaded browser test: passed remotely in Chrome for Testing through [CI](https://github.com/smile-plzz/Element-Screenshot-Extension/actions/runs/38633658703) and [release verification](https://github.com/smile-plzz/Element-Screenshot-Extension/actions/runs/38633658606). Verified a native 480 x 320 PNG, exact green edge pixels (no overlay), clipboard, download, locking, Enter, cancellation and settings validation. Local browser installation was blocked by the environment proxy, so the real browser check ran on GitHub.
- Dependency audit: zero reported vulnerabilities after updating test dependencies. CI enforces npm audit before verification.
- Published packages: [v1.0.1](https://github.com/smile-plzz/Element-Screenshot-Extension/releases/tag/v1.0.1), released only after all automated checks passed.
- Firefox runtime and Microsoft Edge runtime: manual verification pending. Firefox is a compatibility build, not a claim of tested store acceptance.
- Ten real sites, paste into external editors and two weeks of owner usage: pending. Do not present these as completed acceptance criteria.

## Manual acceptance checklist

Serve fixtures using `python -m http.server 8080` from the repository, then open `http://localhost:8080/test-pages/`. For file URLs enable the extension's file access in browser settings.

1. Toolbar and Alt+Shift+S activate/cancel with only activeTab permissions.
2. Capture articles, docs, dashboards, Shopify support screens and six other varied ordinary pages. Paste into a document editor, chat editor and image editor.
3. Test 100%, 75%, 125% browser zoom and 1x/2x/3x display scaling. Confirm sharp PNG dimensions and no extension pixels.
4. Use Arrow Up/Down, Enter, F, Esc. Cancel, change tabs, navigate and return. Verify cursor, scroll and page clicks work normally afterwards.
5. Capture a partially visible card, a tall component, sticky headers, transforms, scroll containers and an open shadow root.
6. Clipboard-only, save-only, both outputs, download/clipboard blocking, reset and settings persistence.
7. Padding, sequence token, nested subfolders, duplicate names and non-ASCII page titles.
8. Browser settings, extension stores, PDF viewers and local file access failures show useful feedback.
9. Repeat core checks in latest Edge and Firefox 140+ with the matching package.

F locks the selection and blocks some JavaScript hover events. It cannot freeze CSS hover, timers, animations, focus changes or every site's menus. Frames are captured as visible rectangular elements, not traversed. Closed shadow roots, DRM, viewport-only cropping and transforms/occlusion are documented platform limits.


## Version 1.1.0 flexible selection

45 local tests pass, including wheel traversal, browser zoom preservation, custom region geometry, reverse drags, tiny drags and Escape cancellation. The loaded browser test additionally exercises scroll expansion/shrinking without page scrolling and Shift-drag capture with PNG dimensions and click-suppression assertions. Release publication is gated on that test.

Version 1.1.0 passed the [release browser checks](https://github.com/smile-plzz/Element-Screenshot-Extension/actions/runs/38635569123), including native PNG capture, scroll expansion/shrinking, region dimensions, clipboard, downloads and page-click suppression. Packages are published at https://github.com/smile-plzz/Element-Screenshot-Extension/releases/tag/v1.1.0.
