import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const chromeExecutable = chromePaths.find((p) => fs.existsSync(p));

if (!chromeExecutable) {
  console.error('No compatible Chromium browser found on machine.');
  process.exit(1);
}

console.log(`Starting E2E Browser Test using: ${chromeExecutable}`);
console.log(`Loading extension from: ${distDir}`);

async function runE2ETests() {
  const browser = await puppeteer.launch({
    executablePath: chromeExecutable,
    headless: false, // Chrome extensions in Manifest V3 run in headed mode or headless=new
    args: [
      `--disable-extensions-except=${distDir}`,
      `--load-extension=${distDir}`,
      '--no-sandbox',
      '--disable-gpu',
      '--window-size=1280,800',
    ],
  });

  try {
    const page = await browser.newPage();
    const testPageUrl = `file://${path.resolve(distDir, 'test-pages/components.html').replace(/\\/g, '/')}`;
    console.log(`Navigating to test fixture: ${testPageUrl}`);
    await page.goto(testPageUrl, { waitUntil: 'load' });

    // 1. Inject content script
    console.log('Test 1: Injecting content script into test page...');
    const contentScriptCode = fs.readFileSync(path.join(distDir, 'content.js'), 'utf-8');
    await page.evaluate((code) => {
      const script = document.createElement('script');
      script.textContent = code;
      document.documentElement.appendChild(script);
    }, contentScriptCode);

    // Wait for host element to mount in shadow DOM
    await page.waitForSelector('#elementshot-host', { timeout: 3000 });
    console.log('✓ ElementShot host attached to DOM.');

    // 2. Check shadow DOM elements
    console.log('Test 2: Verifying shadow DOM isolation and internal nodes...');
    const hasShadowElements = await page.evaluate(() => {
      const host = document.getElementById('elementshot-host');
      if (!host || !host.shadowRoot) return false;
      const box = host.shadowRoot.querySelector('.box');
      const badge = host.shadowRoot.querySelector('.badge');
      const toast = host.shadowRoot.querySelector('.toast');
      return !!(box && badge && toast);
    });

    if (!hasShadowElements) {
      throw new Error('Shadow DOM nodes (.box, .badge, .toast) missing!');
    }
    console.log('✓ Shadow DOM overlay components verified.');

    // 3. Hover element and verify highlight tracking
    console.log('Test 3: Testing hover highlight tracking on #card-alpha...');
    const cardRect = await page.evaluate(() => {
      const card = document.getElementById('card-alpha');
      return card ? card.getBoundingClientRect().toJSON() : null;
    });

    // Move mouse over center of card-alpha
    await page.mouse.move(cardRect.x + cardRect.width / 2, cardRect.y + cardRect.height / 2);
    await new Promise((r) => setTimeout(r, 100)); // wait for animation frame throttle

    const highlightBoxStyle = await page.evaluate(() => {
      const host = document.getElementById('elementshot-host');
      const box = host.shadowRoot.querySelector('.box');
      return {
        display: box.style.display,
        width: box.style.width,
        height: box.style.height,
        left: box.style.left,
        top: box.style.top,
      };
    });

    console.log(`✓ Highlight box rendered: ${JSON.stringify(highlightBoxStyle)}`);
    if (highlightBoxStyle.display !== 'block') {
      throw new Error('Highlight box did not activate on hover!');
    }

    // 4. Test Freeze state
    console.log('Test 4: Testing freeze state toggle (Press F)...');
    await page.keyboard.press('KeyF');
    await new Promise((r) => setTimeout(r, 100));

    const isFrozen = await page.evaluate(() => {
      const host = document.getElementById('elementshot-host');
      const box = host.shadowRoot.querySelector('.box');
      const indicator = host.shadowRoot.querySelector('.freeze-indicator');
      return box.classList.contains('frozen') && indicator.style.display === 'block';
    });

    if (!isFrozen) {
      throw new Error('Freeze state was not activated when pressing F!');
    }
    console.log('✓ Freeze state correctly set (.box.frozen & indicator visible).');

    // 5. Test Escape cancellation and clean teardown
    console.log('Test 5: Testing Esc cancellation and teardown...');
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 100));

    const isCleanedUp = await page.evaluate(() => {
      const host = document.getElementById('elementshot-host');
      const box = host.shadowRoot.querySelector('.box');
      const cursor = document.documentElement.style.cursor;
      return box.style.display === 'none' && cursor === '';
    });

    if (!isCleanedUp) {
      throw new Error('Pick mode did not clean up properly upon Escape!');
    }
    console.log('✓ Pick mode cleanly cancelled, overlay hidden, cursor reset.');

    console.log('\n=======================================');
    console.log('All E2E Browser Tests Passed Successfully!');
    console.log('=======================================\n');
  } finally {
    await browser.close();
  }
}

runE2ETests().catch((err) => {
  console.error('E2E Browser Test Failed:', err);
  process.exit(1);
});
