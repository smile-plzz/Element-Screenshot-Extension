# Store Listing Package for ElementShot

This folder contains all copy, single-purpose justifications, permission declarations, and metadata required for submission to the Chrome Web Store, Microsoft Edge Add-ons, and Firefox Add-ons (AMO).

---

## 1. Product Summary
- **Name:** ElementShot: Element Screenshot
- **Short Name:** ElementShot
- **Default Locale:** English (en)
- **Category:** Productivity / Developer Tools
- **Price:** Free
- **Target Platforms:** Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Opera, Vivaldi

---

## 2. Store Copy

### Short Description (max 132 chars)
One-gesture element screenshot tool: hover over any web component, click it, and instantly copy to clipboard and save.

### Detailed Description
Tired of opening screenshot apps, dragging clumsy rectangles around UI components, and nudging edges pixel by pixel?

ElementShot turns "screenshot a specific element" into a seamless one-gesture workflow:
1. Press Alt+Shift+S (or click the toolbar icon) to enter pick mode.
2. Hover over any UI element. A clean, non-intrusive outline highlights the target with its tag name and live dimensions.
3. Click. The element is captured with razor-sharp fidelity at your screen's native resolution, copied to your clipboard ready to paste, and saved to your Downloads folder.

### Key Features
- **Zero-Friction Capture:** No drag rectangles, no post-crop editing. Click the exact component you want.
- **Dual Output:** Simultaneously copies PNG to your clipboard and saves it to disk in one click.
- **Deep DOM & Shadow DOM Support:** Intelligently inspects open Shadow DOM boundaries and nested web components.
- **Keyboard Precision:**
  - `Arrow Up`: Select the parent container.
  - `Arrow Down`: Select child elements.
  - `F`: Freeze hover state to capture transient dropdowns, menus, and tooltips.
  - `Esc`: Cancel pick mode instantly.
- **HiDPI & Zoom Ready:** Uses true devicePixelRatio math so your screenshots stay crisp on 2x Retina and 4K displays.
- **Customizable Naming & Storage:** Configure filename tokens ({domain}, {tag}, {date}, {time}) and target subfolders in settings.
- **100% Private & Local:** No remote code, zero tracking, zero telemetry. Captured images never leave your machine.

---

## 3. Chrome Web Store Permission Justifications

| Permission | Justification |
|---|---|
| `activeTab` | Temporary access to the current webpage only when you explicitly invoke ElementShot to select an element. |
| `scripting` | Used to inject the isolated pick mode overlay and event listeners into the active webpage on demand. |
| `downloads` | Used to save captured PNG screenshots to your Downloads directory. |
| `storage` | Used to store user settings (filename pattern, download folder, padding, toggle options) via chrome.storage.sync. |
| `clipboardWrite` | Used to write the cropped PNG image to the system clipboard for immediate pasting. |
| `offscreen` | Used in Manifest V3 to perform reliable offscreen canvas operations and clipboard writing fallbacks. |

---

## 4. Single Purpose Declaration
"ElementShot provides a single focused function: capturing individual DOM components on a webpage with a single click, copying them to the clipboard, and saving them to disk."
