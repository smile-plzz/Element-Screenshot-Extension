# Project Context: ElementShot (Element Screenshot Extension)

## Goals
1. One-gesture capture of any DOM element: hover, highlight, click to capture.
2. Simultaneously copy the PNG to clipboard and save it to the Downloads subfolder in a single action.
3. Razor-sharp capture on HiDPI and zoomed screens using devicePixelRatio scaling.
4. Clean, isolated overlay UI using Shadow DOM with pointer-events: none and high z-index.
5. Keyboard navigation: Arrow Up (parent element), Arrow Down (child element), F (freeze hover state), Esc (cancel).
6. Robust handling of viewport clamping, partial capture notices, and sanitized filename templates.
7. Manifest V3 compliant for Chromium (Chrome, Edge) with cross-browser architecture for Firefox.
8. Zero remote network calls, no telemetry, minimal permissions (activeTab, scripting, downloads, storage, clipboardWrite, offscreen).

## Tech Stack
- Platform: Browser Extension (Manifest V3)
- Language: TypeScript (strict mode)
- Build Tool: Vite with multi-entry bundling
- Testing: Vitest for pure logic unit tests, comprehensive test fixtures
- Styles & UI: Vanilla TypeScript with encapsulated Shadow DOM (no framework overhead in content script), modern responsive options page
- APIs: chrome.tabs.captureVisibleTab, chrome.scripting, chrome.downloads, chrome.storage, OffscreenCanvas / Navigator Clipboard API

## Constraints & Requirements
- Source of truth: README.md
- Privacy: 100% local, no analytics, no external scripts or remote code.
- Typography rule: No em-dashes in documentation, UI text, or comments.
- Frame timing: Hide overlay and wait for two animation frames before capturing to prevent overlays in screenshots.
- Fallback strategy: If clipboard write fails, file is still saved; if download fails, clipboard remains intact; toast truthfully reports each step.
