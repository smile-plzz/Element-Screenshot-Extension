# ElementShot

Click a component, get the screenshot. A local-only browser extension that captures the visible pixels of a selected element as a PNG, copies it and saves it to Downloads.

**Version 1.0.1:** source and browser packages are prepared. Store publication and manual browser/site acceptance remain separate steps, tracked in [QA](docs/QA.md) and [Release guide](docs/RELEASE.md).

## Install and use

1. Download a package from [GitHub Releases](https://github.com/smile-plzz/Element-Screenshot-Extension/releases), or build with `npm ci && npm run verify` on Node 22+.
2. Extract the Chrome package. Open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted folder (or `dist/` for a local build).
3. Open an ordinary web page, click the pinned toolbar icon or press **Alt+Shift+S**, hover a component and click or press **Enter**.
4. Paste the PNG into your editor. Files go to **Downloads/ElementShots/**. Right-click the toolbar icon and choose **Options** to change destinations, padding, filenames or continuous mode.

**Controls:** Up selects parent; Down returns to child; F locks selection; Esc cancels. Captures include only visible viewport pixels. Partial results are labeled. Clipboard and save outcomes are reported separately. F does not freeze all page behavior.

**Filename tokens:** `{domain}`, `{date}`, `{time}`, `{tag}`, `{class}`, `{id}`, `{title}`, `{n}`. The sequence is session-scoped and may restart when the background worker restarts. Duplicate downloads are uniquified by the browser.

**Firefox:** build with `npm run verify`, then load `dist-firefox/manifest.json` through `about:debugging`. This is a compatibility package; permanent installation requires Mozilla signing. Use Firefox 140+. Chrome/Edge require 116+.

No accounts, analytics, history or remote code. Only settings use browser storage; browser sync can synchronize settings through the browser provider. Screenshots stay in your clipboard and Downloads. See [Privacy](docs/PRIVACY.md), [Terms](docs/TERMS.md) and [Support](docs/SUPPORT.md).

## Development

- `npm run verify`: typecheck, test, build, package.
- `npm run watch`: rebuild production entry points as files change; reload the extension afterwards.
- `CHROME_PATH=/path/to/chrome npm run test:e2e`: loaded-extension browser test.
- Fixtures stay in `test-pages/`; serve them over localhost. They are excluded from release archives.

The original implementation specification below remains the source of product scope. Planning milestones and target acceptance checks describe intent, not proof of store launch or browser verification.

---

# Original product specification

A browser extension that turns "screenshot a part of a web page" into one gesture: hover over a component, click it, and the cropped image is saved to a folder and copied to the clipboard, ready to paste.

- Owner: Ismail
- Document status: original v1.0 specification, preserved for scope; current release status above
- Date: 2026-10-14
- Intended readers: the owner, and any AI coding assistant or developer implementing the extension

---

## 1. Summary

People who write documentation, file bug tickets, review designs or answer support requests take UI screenshots all day. The usual workflow is slow and imprecise: open a screenshot tool, drag a rectangle around the thing, adjust the edges, save, then copy or upload. Chrome DevTools ("Capture node screenshot") and Firefox's built-in screenshot tool can capture a single element, but each needs several clicks and, in DevTools, an open panel and a node selected in the tree.

This project is a focused extension that does one thing:

1. Press a hotkey or click the toolbar icon to enter **pick mode**.
2. Move the cursor. The element under it is highlighted with an overlay, like DevTools inspect mode.
3. Click. The element is captured as a PNG, copied to the clipboard and saved to disk.
4. A small toast confirms "Copied and saved", and pick mode ends.

The product is the speed and precision of that loop. It is not a general screenshot suite.

---

## 2. Context

### 2.1 The situation

- Full-page and region-drag screenshot extensions are common. Component-aware capture ("click the thing, get exactly the thing") is rare outside DevTools.
- Region dragging is imprecise: edges are clipped or include stray pixels, and repeating a capture with identical framing is hard.
- DevTools can do it, but the path is long and unfamiliar to non-developers such as writers, PMs and support staff.
- Browsers do not allow extensions to write to arbitrary folders, so saving has to work within the Downloads folder.

### 2.2 Existing alternatives to check

- Built-in: Chrome DevTools "Capture node screenshot", Firefox Screenshots (element-aware hover selection of page regions).
- Extensions: Awesome Screenshot, GoFullPage, FireShot, and similar tools, which mostly do full-page or region capture.
- Before committing to the name and positioning, run a fresh review of these and any newer entrants. This document does not claim a complete or current competitor list.

### 2.3 Why this is worth doing

- It is small enough to build as a first working version in a weekend, so the risk of learning something is low.
- It solves a daily annoyance for the owner's own documentation work, so there is a built-in first user.
- It is a clean showcase project: Manifest V3, content scripts, image processing, clipboard and downloads APIs, cross-browser packaging.
- It can later be listed on the owner's indie app store as a free product or paid tier (see the Indie App Marketplace plan).

---

## 3. Product and business model

### 3.1 Who it is for

| User | Typical use |
|---|---|
| Documentation and support writers | Paste UI snippets into help articles and replies |
| QA testers | Attach exact components to bug tickets |
| Product managers and business analysts | Drop UI parts into specs, decks and Slack |
| Designers | Grab implemented components for review and comparison |

### 3.2 Positioning

"Click a component, get the screenshot." The differentiator is component awareness plus zero extra steps. Everything that adds steps (editors, galleries, accounts) must stay optional and out of the main path.

### 3.3 Monetization options (decide after the free version proves useful)

- Free core: pick, capture, copy, save, filename template.
- Possible paid tier: tall-element stitching, annotation, cloud history, advanced export formats.
- Alternative: keep everything free and open source, and treat the project as portfolio and personal tooling.

Note: payment and licensing for browser extensions is a separate problem. Browser store payment options have changed over time, so verify current options in the Chrome Web Store, Edge Add-ons and Firefox Add-ons policies before designing a paid tier. Payouts from Bangladesh must be checked as described in the marketplace plan.

Keep v1 free, with no accounts, no telemetry and no paid features.

---

## 4. Goals and non-goals

### Goals (v1)

1. One-gesture capture of a single DOM element: hotkey, hover, click.
2. Copy the PNG to the clipboard and save a file in one action.
3. Sharp output on HiDPI screens.
4. Predictable behavior: clear overlay, clear feedback, easy cancel.
5. Work in Chrome and Edge first, with Firefox as a follow-up.
6. Request the minimum permissions and collect no data.

### Non-goals (v1)

- No full-page capture, scroll-and-stitch or video recording.
- No annotation editor, cloud sync, accounts or sharing links.
- No capture inside cross-origin iframes (documented limitation).
- No DOM-to-SVG export or "copy as HTML/CSS".
- No mobile browsers.
- No remote code or remote configuration of any kind.

---

## 5. Policy: privacy and permissions

Extensions that read page content face strict review and user suspicion, so these rules are part of the product.

1. **Local only:** captured images never leave the device. No network calls from the extension in v1.
2. **No telemetry:** no analytics, crash reporting or tracking in v1. If added later, it must be opt-in and disclosed.
3. **Minimal permissions:** prefer `activeTab` plus `scripting` over broad host permissions, so the extension only touches a page when the user invokes it.
4. **No page data stored:** only settings (filename template, format, scale) are saved, using `chrome.storage.sync` or `local`.
5. **Sensitive pages:** captured images may contain private information. The extension should not store history in v1. If history is added later, it must be local, clearable and off by default.
6. **Store compliance:** a single-purpose description, a published privacy policy, and a justification for each permission, ready before submission.

---

## 6. Users and key scenarios

| # | Scenario | Expected result |
|---|---|---|
| S1 | User presses the hotkey on any normal web page | Pick mode starts, cursor changes, hovered element is outlined |
| S2 | User clicks an element | PNG is on the clipboard, a file is saved, toast confirms |
| S3 | User presses Esc during pick mode | Pick mode ends, nothing is captured |
| S4 | User wants the parent container instead of the exact element | Arrow Up moves selection to the parent, Arrow Down to a child, outline updates |
| S5 | Element is partly outside the viewport | v1 captures the visible portion and shows a notice. Optionally scrolls the element into view first |
| S6 | Element is inside a dropdown or tooltip that closes on hover loss | User locks the page state with a hotkey, then picks (see 7.2) |
| S7 | Page is a restricted page (browser settings page, extension store, PDF viewer) | Clear message that capture is not available here |
| S8 | Clipboard write is blocked or fails | File is still saved, and the toast says clipboard failed |
| S9 | User changes the filename template or scale | Setting applies to the next capture and persists |
| S10 | Screen is 2x or 3x pixel density, or the page is zoomed | Output resolution matches the real pixels, not blurry |

---

## 7. Functional requirements

### 7.1 Activation

- FR-1: Toolbar button starts pick mode on the active tab.
- FR-2: A keyboard shortcut starts pick mode. Default suggestion: Alt+Shift+S, defined through the `commands` API so users can remap it. The default must be checked for conflicts with common browser and OS shortcuts.
- FR-3: Pressing the shortcut or Esc again cancels pick mode.
- FR-4: The extension must not run on pages where scripting is blocked, and must say so clearly.

### 7.2 Pick mode (content script)

- FR-5: On `mousemove`, find the element under the cursor and draw a highlight box over its `getBoundingClientRect()`.
- FR-6: The overlay uses `pointer-events: none`, a very high z-index and an isolated style scope (shadow DOM host) so page CSS cannot affect it, and it cannot affect the page.
- FR-7: A small label shows the element tag and size (for example `div.card 320 x 180`).
- FR-8: Arrow Up selects the parent, Arrow Down selects the first child (or the previous child on the path), and the highlight updates.
- FR-9: While in pick mode, the click that selects an element must not trigger the page's own click handlers or navigation (capture-phase listener with `preventDefault` and `stopPropagation`).
- FR-10: A "freeze" key (for example F) pauses highlight updates and blocks page hover changes where possible, so transient menus stay open while the user moves the cursor and picks. Document that some sites will still close menus on blur.
- FR-11: Scroll and resize while in pick mode must refresh the highlight.
- FR-12: Shadow DOM: resolve the deepest element by walking `shadowRoot.elementFromPoint` recursively for open shadow roots. Closed shadow roots are a documented limitation.
- FR-13: Same-origin iframes are a stretch goal. Cross-origin iframes are out of scope for v1.

### 7.3 Capture

- FR-14: On click, hide the overlay and toast, wait for the next painted frame, then request the capture so the overlay never appears in the image.
- FR-15: Capture the visible tab with `chrome.tabs.captureVisibleTab` (PNG) from the background service worker.
- FR-16: Crop to the element rectangle, multiplying coordinates by `devicePixelRatio`. Clamp the rectangle to the viewport. If clamped, mark the result as "partial".
- FR-17: Perform cropping with `OffscreenCanvas` (service worker) or an offscreen document, and produce a PNG blob.
- FR-18: Optional padding or margin inclusion: a setting that expands the rectangle by a chosen number of CSS pixels, or by the element's computed margin.
- FR-19: Output scale option (1x, 2x, 3x) is a later feature. v1 outputs native device resolution.
- FR-20: Respect `border-radius` as an option (transparent corners) is a stretch goal.

### 7.4 Clipboard and saving

- FR-21: Write the PNG with `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` from the content script, within the user gesture window. Because the clipboard API needs a focused document, fall back to an offscreen document if required, and test this carefully.
- FR-22: Save with `chrome.downloads.download` using a blob or data URL, into a subfolder of Downloads (for example `ElementShots/`).
- FR-23: Filename template with tokens such as `{domain}`, `{date}`, `{time}`, `{tag}`, `{class}`, `{n}`. Sanitize to a safe filename and avoid collisions with `conflictAction: "uniquify"`.
- FR-24: Options to disable saving or disable clipboard, so users can choose either or both.
- FR-25: Toast feedback: "Copied and saved", "Copied only", "Saved only" or an error message, shown briefly and dismissible.

### 7.5 Settings (options page)

- FR-26: Shortcut link (opens the browser's shortcut page), filename template, subfolder name, clipboard on/off, save on/off, padding amount, behavior after capture (exit or stay in pick mode).
- FR-27: Settings stored with `chrome.storage.sync` (falling back to local) and applied without reloading tabs.
- FR-28: Reset to defaults.

### 7.6 Later features (not v1)

- Tall element scroll-and-stitch capture, handling fixed and sticky elements.
- Multi-capture mode (stay in pick mode after each capture).
- Annotation (arrows, boxes, blur) before copy.
- Output formats: WebP, JPEG, and "copy as HTML/CSS".
- Hide-background mode for transparent cutouts.
- Local capture history with re-copy.
- Per-site remembered settings.
- Cloud history and sharing (only if a paid tier is pursued).

---

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | No remote code, no `eval`, strict extension CSP, no network access. Overlay UI isolated from the page. |
| Privacy | No telemetry, no data leaves the device, only settings are stored. |
| Performance | Entering pick mode in under 100 ms, highlight updates throttled to animation frames, capture-to-clipboard in under one second for typical elements. |
| Reliability | Falls back gracefully when clipboard or download fails. No stuck overlay: pick mode always cleans up on Esc, navigation or tab change. |
| Compatibility | Latest Chrome and Edge at launch. Firefox after the core works. Layout correctness on pages with transforms, zoom, sticky headers and scroll containers. |
| Accessibility | Pick mode operable by keyboard where possible. Toast text readable and announced politely (`aria-live`). Overlay colors have enough contrast. |
| Maintainability | Small modules, typed (TypeScript), unit-tested pure functions (rect math, filename templates). |
| Size | Small package, no heavy dependencies. |

---

## 9. Technical approach

### 9.1 Recommended stack

| Layer | Choice | Reason |
|---|---|---|
| Manifest | **Manifest V3** | Required for Chrome and Edge, supported in Firefox with differences |
| Language | **TypeScript** | Safer messaging and rect math |
| Build | **Vite** with a web extension plugin (or plain esbuild) | Fast builds, simple multi-entry bundling |
| UI | Vanilla TypeScript with a shadow DOM overlay | No framework weight in the content script. A small framework is acceptable for the options page only |
| Storage | `chrome.storage` | Built in, syncs settings |
| Cross-browser | `webextension-polyfill` or careful feature checks | Firefox uses the `browser.*` namespace and background event pages |
| Tests | Vitest for pure logic, Playwright with a loaded extension for end-to-end checks | Real-browser verification of capture and clipboard |
| Packaging | Zip per browser, store listing assets | Chrome Web Store, Edge Add-ons, Firefox Add-ons |

### 9.2 Architecture

- **Service worker (background):** handles the toolbar click and command, injects the content script with `chrome.scripting.executeScript`, receives the capture request, calls `captureVisibleTab`, crops the image and returns or saves it.
- **Content script:** pick mode UI, element resolution, overlay, keyboard handling, toast, and the clipboard write.
- **Offscreen document (if needed):** a place for canvas and clipboard work that the service worker cannot do directly.
- **Options page:** settings form.
- **Messaging:** typed messages between parts, for example `START_PICK`, `CAPTURE_REQUEST {rect, dpr, meta}`, `CAPTURE_RESULT {status}`.

### 9.3 Capture flow

1. User triggers pick mode. The service worker injects the content script (using `activeTab`).
2. Content script shows the overlay and tracks the hovered element.
3. User clicks. The content script computes the rect, the device pixel ratio and element metadata, hides all extension UI, waits two animation frames, and sends `CAPTURE_REQUEST` to the service worker.
4. The service worker calls `captureVisibleTab` and receives a PNG data URL of the visible viewport.
5. The service worker crops the image to the rect (rect x DPR), producing a PNG blob.
6. The blob goes to the content script (or offscreen document) for the clipboard write, and to `chrome.downloads.download` for saving, using the filename template.
7. The content script shows the toast with the actual result of each step, then exits pick mode.

Rules:

- The captured pixels are the source of truth. Never re-render the DOM in v1.
- Keep money-style care with numbers: use floats for CSS rects, round only at the final crop, and always clamp to image bounds.
- Hide the overlay before capturing and wait for a painted frame, or the highlight appears in the output.
- Log failures to the console only, never to a remote service.

### 9.4 Known hard problems and planned handling

| Problem | Plan |
|---|---|
| Element taller or wider than the viewport | v1: capture the visible part and mark as partial. Later: scroll, capture slices, stitch, and neutralize fixed/sticky elements after the first slice. Remember `captureVisibleTab` is rate limited (a few calls per second), so stitching needs pacing |
| Hover states and dropdowns that vanish | Freeze key, `pointer-events: none` on the overlay, and a note that some sites cannot be frozen |
| iframes | Same-origin: inject with `all_frames` and translate coordinates. Cross-origin: out of scope for v1 |
| Shadow DOM | Recursive `shadowRoot.elementFromPoint` for open roots |
| Elements with transforms, rotated or clipped by `overflow` | Use the bounding rect of what is actually painted, and document edge cases |
| Page zoom and HiDPI | Use `window.devicePixelRatio` at capture time and verify by comparing crop size to expected pixels |
| Video, canvas, WebGL, protected media | Pixel capture generally works for visible content. DRM-protected video may appear black, which is a platform limitation |
| Sticky headers covering the element | Capture shows what is visible. Offer a note, and later a "hide fixed elements" option |
| Transparent background cutouts | Later option: temporarily neutralize backgrounds, with clear warnings |
| Alternative: DOM-to-canvas rendering | Avoids viewport limits but is less faithful (fonts, CSS, cross-origin images). Keep as a later experiment, not the default |

### 9.5 Cross-browser notes

- Chrome and Edge share the Chromium implementation. Test both.
- Firefox supports `tabs.captureVisibleTab` and an equivalent flow, but background context, clipboard permissions and the `commands` behavior differ. Maintain a thin adapter layer and a separate manifest build.
- Safari is out of scope for v1.

### 9.6 Permissions (planned, to verify against current docs)

- `activeTab`: temporary access to the active tab on user invocation.
- `scripting`: inject the content script on demand.
- `downloads`: save files.
- `storage`: save settings.
- `clipboardWrite`: allow writing the image where required.
- `offscreen`: only if the offscreen document approach is needed.
- No broad host permissions, no `tabs` permission unless proven necessary.

---

## 10. Legal, store and compliance

None of this is legal advice. Confirm current rules before publishing.

| Topic | What to confirm |
|---|---|
| Store policies | Single-purpose policy, permission justification, privacy policy requirements and review times for Chrome Web Store, Edge Add-ons and Firefox Add-ons |
| Developer accounts | Registration cost and identity or payment verification requirements for a Bangladesh-based developer |
| Privacy policy | A short public page stating that nothing leaves the device and what settings are stored |
| Content and copyright | The tool captures what the user can already see. The terms should say users are responsible for the rights to content they capture |
| Name and branding | Check trademark and store name availability for the final name, avoid names similar to existing screenshot tools |
| Open source license | Choose a license for the code (for example MIT) and list third-party notices |
| Paid tier (later) | Payment method, taxes and payout path, as covered in the marketplace plan |

Documents to prepare: Privacy Policy, short Terms of Use, store description and permission justifications, support contact page, changelog.

---

## 11. Metrics and success criteria

The first working version is successful if:

- A capture works on at least ten varied popular sites (articles, dashboards, web apps, documentation sites) without the overlay appearing in the image.
- Pick-to-clipboard takes under two seconds for the user, and under one second of processing.
- The pasted image is sharp on a HiDPI display and matches the highlighted element's bounds within a pixel.
- No stuck overlays or leftover listeners after cancel, navigation or tab switch.
- The owner uses it for real documentation work for two weeks and the loop feels faster than the current tool.

After public release, watch: installs, weekly active users, uninstall rate, review ratings and complaints, most common failing sites, and permission-related warnings during review.

---

## 12. Delivery plan

| # | Milestone | Outcome | Acceptance check |
|---|---|---|---|
| M0 | Decisions and setup | Name, repo, license, build tooling, test pages, store accounts started | Written decisions, extension loads unpacked and shows a hello message |
| M1 | Pick mode | Hotkey and toolbar activation, overlay, label, Esc, parent/child arrows | Highlight is accurate on a set of test pages, no page clicks leak through |
| M2 | Capture and crop | Capture visible tab, crop with DPR scaling, clamp, partial flag | Output size and sharpness verified at 1x and 2x, overlay never appears |
| M3 | Clipboard and save | Clipboard write, download with filename template, toast states | Paste works in Slack, a docs editor and an image editor, file lands in the subfolder |
| M4 | Settings | Options page, persisted settings, shortcut guidance | Settings change behavior without reload |
| M5 | Hardening | Restricted-page handling, error paths, shadow DOM, accessibility, unit and end-to-end tests | Checklist passes across the test site list |
| M6 | Cross-browser | Firefox build and Edge check | Core flow works on all targets |
| **v1.0** | **Store release** | **Published on Chrome Web Store and Edge Add-ons (Firefox after review)** | **A real user installs and completes a capture** |
| M7 | Growth | Stitching, multi-capture, annotation, export formats, history | Driven by feedback and the most requested pain points |

Order of work inside each milestone: types and interfaces, tests, implementation, then UI polish.

---

## 13. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Clipboard write fails in some contexts (focus, permissions, browser differences) | Core promise broken | Early prototype in M3, offscreen fallback, always save the file as a backup |
| Overlay appears in the screenshot or page styles break the overlay | Poor output quality | Shadow DOM isolation, hide and wait for paint before capture |
| `captureVisibleTab` limits (viewport only, rate limits, restricted pages) | Incomplete capture | Mark partial captures clearly, design stitching with pacing later |
| Page hover and menus cannot be held open | Frustrating on dropdown-heavy sites | Freeze key, documented limitations, test on common sites |
| Store review delays or rejection over permissions | Launch delay | Minimal permissions, clear justification text, privacy policy ready |
| Built-in browser tools improve and close the gap | Weaker differentiation | Keep the one-gesture loop faster, add stitching and annotation as real value |
| Competitors add component-aware capture | Lower interest | Focus on speed and polish, open source credibility, later features |
| Captured images expose private data | Trust and privacy issues | No network, no history by default, clear policy |
| Sites change layout and break selection logic | Edge-case bugs | Rely on rect math and real pixels, not site-specific logic |
| Small niche limits revenue | Paid tier may not pay for itself | Treat v1 as portfolio and personal tooling, decide on monetization after real usage data |

---

## 14. Open questions for the owner

1. Final name and whether it is a standalone brand or part of the portfolio and store.
2. Free and open source only, or a paid tier later?
3. Chrome and Edge first, or Firefox at the same time?
4. Default behavior after capture: exit pick mode, or stay on for multiple captures?
5. Default save folder name and filename template (for example `{domain}-{date}-{time}`)?
6. Should padding and margin inclusion be in v1 or later?
7. Is "partial capture with notice" acceptable in v1, or is scroll-and-stitch required at launch?
8. Which test sites and apps matter most for the owner's daily work?
9. Which license for the code?
10. Budget for developer accounts and any assets (icon, store graphics)?

---

## 15. Instructions for the implementing assistant (for ChatGPT, Claude or any developer)

- Build in milestone order (section 12). Keep each milestone small and runnable, and end each with a short "how to run and verify" note.
- Use Manifest V3 and TypeScript. Keep permissions to the minimum list in section 9.6 and explain any addition.
- The extension must make no network requests and include no analytics or remote code.
- Isolate the overlay and toast in a shadow DOM and use `pointer-events: none` on the overlay.
- Always hide extension UI and wait for a painted frame before calling `captureVisibleTab`.
- Crop using `devicePixelRatio`, clamp to the image bounds, and mark clamped results as partial.
- Treat clipboard and download as independent steps. If one fails, the other still runs and the toast reports each result honestly.
- Write unit tests for rect math, DPR scaling, clamping and filename template sanitizing. Write end-to-end tests with a loaded extension for pick, capture and cleanup.
- Provide a test page set (long page, sticky header, shadow DOM, transforms, zoomed, HiDPI notes) and document manual checks.
- Always clean up on Esc, navigation and tab change: remove listeners and overlay.
- Do not build annotation, stitching or history until the v1.0 acceptance check passes.
- Do not use em-dashes in documentation, UI text or comments.
- When a decision is unclear, choose the safest default, state the assumption, and continue.

---

## 16. Glossary

- **Pick mode:** the state where hovering highlights page elements and a click captures one.
- **Content script:** extension code that runs inside a web page and can read and draw on it.
- **Service worker (background):** the extension's event-driven script that handles browser APIs such as tab capture and downloads.
- **Manifest V3 (MV3):** the current extension platform format, with service workers instead of persistent background pages in Chrome.
- **`captureVisibleTab`:** the extension API that returns an image of the currently visible part of a tab.
- **Device pixel ratio (DPR):** the ratio of physical pixels to CSS pixels, for example 2 on many high-density screens.
- **Bounding rect:** the rectangle describing an element's position and size in the viewport.
- **Shadow DOM:** an encapsulated DOM subtree, used by web components and by this extension's overlay.
- **Scroll-and-stitch:** capturing a tall element in several slices and joining them into one image.
- **Offscreen document:** an extension page created without a visible window, used for canvas, audio or clipboard work that a service worker cannot do.
- **`activeTab`:** a permission that grants temporary access to the current tab after the user invokes the extension.

---

## 17. Developer Guide: Build, Test and Run

### 17.1 Prerequisites
- Node.js v22+
- npm v9+

### 17.2 Installation
```bash
npm install
```

### 17.3 Running Tests
```bash
npm test
```
Runs the Vitest unit test suite covering rect calculation, viewport clamping, DPR scaling, filename generation, and settings storage.

### 17.4 Building the Extension
```bash
npm run build
```
Compiles and bundles the content script, background service worker, options page, offscreen document and icons into `dist/`.

### 17.5 Packaging for Release
```bash
npm run package
```
Generates unpacked builds for Chromium (`dist/`) and Firefox (`dist-firefox/`), plus ready-to-upload zip archives in `releases/`.

### 17.6 Loading in Chromium (Google Chrome, Microsoft Edge, Brave)
1. Open `chrome://extensions` or `edge://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory.
4. Navigate to any web page or test fixture served from `test-pages/` over localhost.
5. Press `Alt+Shift+S` or click the ElementShot toolbar icon to begin capturing.

### 17.7 Loading in Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `dist-firefox/manifest.json`.
