# Changelog

## 1.1.0 - 2026-10-15

Added scroll-to-expand/shrink selection and Shift-drag custom area capture, including live dimensions, reverse drags, cancellation, tiny-drag protection and event cleanup. Added behavioral and real-browser coverage for both controls.

## 1.0.1 - 2026-10-15

See [release notes](docs/RELEASE-NOTES.md). Fixed worker PNG encoding, overlay contamination, duplicate captures, zoom-out scaling, unsafe filename/path handling, inaccurate feedback and Firefox manifest adaptation. Added Enter capture, actual picker regression coverage, sequence filenames, validated settings, reproducible packaging and gated release automation.


All notable changes to the ElementShot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-14

### Added
- Initial extension architecture supporting Manifest V3 for Chrome, Edge, and Firefox.
- Interactive pick mode with Shadow DOM overlay and cursor highlight.
- Keyboard controls: Esc (cancel), Arrow Up (parent element), Arrow Down (child element), F (freeze hover state).
- Precise viewport cropping with HiDPI devicePixelRatio math and bounds clamping.
- Dual output pipeline: writes PNG to clipboard and saves to Downloads folder.
- Configurable filename templates with tokens: {domain}, {date}, {time}, {tag}, {class}, {title}.
- Options page for customizing output subfolder, filename template, padding, and clipboard/download behaviors.
- Fallback offscreen document for canvas processing and reliable clipboard writing.
- Comprehensive test pages and Vitest test suite covering rect math, filename sanitization, options storage, and URL security validation.
- Cross-browser packaging script creating ready-to-upload zip archives for Chrome, Edge, and Firefox.
- MIT License declaration and copyright notices.
- Comprehensive privacy policy, terms of use, and support guides in docs/.
- Store listing metadata and permission justifications in store/store-listing.md for Chrome Web Store and Firefox AMO.
- Automated Chromium browser E2E test suite running on live web components via puppeteer-core.
- Continuous integration and automated packaging workflow via GitHub Actions (.github/workflows/ci.yml).
- Tab switch and navigation lifecycle cleanup via visibilitychange, beforeunload, and chrome.tabs.onActivated listeners.
