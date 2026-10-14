ElementShot 1.0.1 completes the core element capture workflow and fixes release blockers in the initial implementation.

- Native-resolution PNG capture using actual screenshot dimensions, including zoom below 100%.
- Worker-compatible image encoding and complete overlay hiding before capture.
- Click or Enter capture, parent/child traversal, selection locking, padding and continuous mode.
- Independent clipboard and download outcomes, with clear failure feedback.
- Safe Windows filenames, nested Downloads subfolders and `{n}` sequence token.
- Real picker regression tests, loaded-extension browser checks and release automation.
- Chromium and Firefox packages with separate permission and manifest handling.

Install: download the Chrome archive, extract it, enable Developer mode in chrome://extensions or edge://extensions, choose Load unpacked and select the extracted folder. Firefox temporary loading uses about:debugging and the Firefox archive's manifest.json. Permanent Firefox installation requires a Mozilla-signed build.

Store publication and real-user acceptance checks remain separate from this source/package release. See docs/RELEASE.md and docs/QA.md.
