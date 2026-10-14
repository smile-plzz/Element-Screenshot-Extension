# Release guide

## Source and package release

Use Node 22+, `npm ci`, then `npm run verify`. Archives appear in `releases/` with the version from the manifest. The Chrome archive also serves Edge. Firefox packaging removes Chromium's offscreen permission, uses an event background script and declares no data collection. Current target: Chrome/Edge 116+ and Firefox 140+.

Run the loaded-extension test using `CHROME_PATH=/path/to/chrome npm run test:e2e`. CI runs it with Chrome for Testing. Push a version tag matching package.json and manifest.json, for example `v1.0.1`. The release workflow verifies, tests and publishes archives through GitHub Releases only if all checks pass. A failed browser check blocks publication. Use the workflow logs to investigate; never bypass the release gate.

Use semantic versions for subsequent changes. Build outputs are ignored by git and reproduced by the workflow. Do not ship test fixtures or node_modules.

## Store launch

A GitHub package is installable in developer mode. It is not an approved Chrome Web Store, Edge Add-ons or Firefox Add-ons listing. Store launch requires the owner's developer accounts, any registration/payment/identity steps, listing assets and store review. No submission or approval is implied by the package build.

1. Complete the browser and real-site checks in QA.md.
2. Publish the privacy policy at a public URL. The repository's docs/PRIVACY.md is the source.
3. Use store/store-listing.md for descriptions and permission explanations.
4. Upload the Chrome package to Chrome Web Store and Edge Add-ons. Upload the Firefox package to AMO for signing and review. Provide source/build instructions if requested.
5. Capture genuine product screenshots from the release build for listing assets.
6. Install the approved store build as a real user and verify capture, save and paste.
7. Add actual store links to the README after acceptance.

## Build decisions

Keep the existing ElementShot project name, MIT license, free/local-only core, default exit after capture and Downloads/ElementShots destination. Padding and continuous mode were already present and are retained. No stitching, annotation, history, accounts or payments are added ahead of the README's acceptance gate. Name availability and store listing availability are not verified trademark claims.
