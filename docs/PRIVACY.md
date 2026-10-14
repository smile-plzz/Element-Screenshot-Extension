# Privacy Policy for ElementShot

**Last updated:** 2026-10-14  
**Product:** ElementShot (Element Screenshot Extension)  
**Developer:** Ismail Hossain  

ElementShot is designed from the ground up with strict privacy principles. Your data, your screen captures, and your browsing habits are entirely your own.

---

## 1. Local Processing Only
- All screenshots captured with ElementShot are created and processed entirely on your local device.
- ElementShot contains no external network endpoints, no remote APIs, and no telemetry services.
- Screenshots are saved directly to your local computer's Downloads directory and/or copied to your local system clipboard.
- The extension never uploads image data, DOM content, URL history or capture metadata. Browser-managed settings sync may synchronize preferences through the browser provider.

## 2. No Analytics or Telemetry
- ElementShot does not track user behavior, page visits, click counts, or usage metrics.
- There are no third-party tracking scripts, advertising trackers, or external crash reporting libraries.

## 3. Data Storage
ElementShot only stores extension settings in your browser using `chrome.storage.sync` (with a local fallback):
- Download subfolder name (default: `ElementShots`)
- Filename format template (default: `{domain}_{tag}_{date}_{time}`)
- Element padding amount in pixels (default: `0`)
- Output preferences (toggle copy to clipboard, toggle save to disk, toggle continuous pick mode)

No browsing history, webpage contents, or captured images are ever stored in extension storage.

## 4. Permissions Justification
ElementShot requests only the minimum permissions necessary to function:
- `activeTab`: Grants temporary access to the active webpage only when you explicitly invoke the extension via keyboard shortcut or toolbar icon.
- `scripting`: Required to inject the pick mode overlay into the active page upon user request.
- `downloads`: Required to save cropped screenshot PNG files into your local Downloads directory.
- `storage`: Required to save your extension preferences across browser sessions.
- `clipboardWrite`: Required to write the captured screenshot PNG image to your system clipboard for immediate pasting.
- `offscreen` (Chromium only): Used in modern Manifest V3 environments to provide a reliable fallback for image manipulation and clipboard writing.

## 5. Third-Party Services
ElementShot connects to zero third-party services, APIs, or external servers.

## 6. Open Source
ElementShot is open source software. The source code is publicly inspectable at:  
https://github.com/smile-plzz/Element-Screenshot-Extension

## 7. Contact
If you have questions or concerns regarding this privacy policy, please open an issue at:  
https://github.com/smile-plzz/Element-Screenshot-Extension/issues
