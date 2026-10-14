import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const executablePath = process.env.CHROME_PATH || [
  '/usr/bin/chromium', '/usr/bin/google-chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(file => fs.existsSync(file));
if (!executablePath) throw new Error('Set CHROME_PATH to a Chrome for Testing or Chromium executable.');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'elementshot-e2e-'));
const extension = path.join(temp, 'extension');
fs.cpSync(path.join(root, 'dist'), extension, { recursive: true });
const productionManifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json')));
assert.equal(productionManifest.host_permissions, undefined);
// Test-only host access allows deterministic driver injection. Shipped manifest stays activeTab-only.
fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ ...productionManifest, host_permissions: ['<all_urls>'] }));
const server = http.createServer((_request, response) => {
  response.setHeader('Content-Type', 'text/html');
  response.end(`<!doctype html><style>body{margin:0}#card{position:absolute;left:100px;top:100px;width:240px;height:160px;background:rgb(34,197,94)}#child{margin:20px;width:80px;height:40px;background:white}</style><div id="card"><button id="child">Capture me</button></div><script>window.clicks=0;document.addEventListener('click',()=>window.clicks++);</script>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({ executablePath, enableExtensions: [extension], pipe: true, headless: process.env.HEADED !== '1', args: [
    '--no-sandbox', '--enable-unsafe-extension-debugging', '--force-device-scale-factor=2',
  ] });
  const target = await browser.waitForTarget(target => target.type() === 'service_worker' && target.url().endsWith('/background.js'));
  const worker = await target.worker();
  const extensionId = target.url().split('/')[2];
  const origin = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage();
  await browser.defaultBrowserContext().overridePermissions(origin, ['clipboard-read', 'clipboard-write']);
  await page.setViewport({ width: 1000, height: 700, deviceScaleFactor: 2 });
  await page.goto(origin);
  await page.bringToFront();
  const baseline = await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  });
  // The baseline also consumes captureVisibleTab rate budget.
  await new Promise(resolve => setTimeout(resolve, 650));
  const baselineBytes = Buffer.from(baseline.split(',')[1], 'base64');
  const expectedWidth = Math.round(240 * baselineBytes.readUInt32BE(16) / 1000);
  const expectedHeight = Math.round(160 * baselineBytes.readUInt32BE(20) / 700);
  await worker.evaluate(async () => {
    await chrome.storage.sync.set({ saveToDisk: true, copyToClipboard: true, padding: 0, stayInPickMode: false });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  });
  await page.waitForSelector('#elementshot-host');
  await page.mouse.move(105, 105);
  await page.waitForFunction(() => document.getElementById('elementshot-host').shadowRoot.querySelector('.badge').textContent.includes('div#card'));
  await page.keyboard.press('f');
  await page.mouse.move(900, 600);
  assert.equal(await page.evaluate(() => document.getElementById('elementshot-host').shadowRoot.querySelector('.box').classList.contains('frozen')), true);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const toast = document.getElementById('elementshot-host').shadowRoot.querySelector('.toast');
    return toast.classList.contains('visible') && toast.textContent.includes('Copied and saved');
  }, { timeout: 15000 });
  assert.equal(await page.evaluate(() => window.clicks), 0);
  const image = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const bitmap = await createImageBitmap(await item.getType('image/png'));
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
    const pixel = [...ctx.getImageData(0, 0, 1, 1).data];
    return { width: bitmap.width, height: bitmap.height, pixel };
  });
  assert.equal(image.width, expectedWidth); assert.equal(image.height, expectedHeight);
  console.log(`Native screenshot crop verified: ${image.width} x ${image.height}`);
  assert.deepEqual(image.pixel, [34, 197, 94, 255]); // No highlight border in captured pixels.
  await worker.evaluate(async () => {
    const downloads = await chrome.downloads.search({ limit: 1, orderBy: ['-startTime'] });
    if (!downloads[0]?.filename.endsWith('.png')) throw new Error('PNG download missing');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { type: 'START_PICK' });
  });
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.documentElement.style.cursor), '');
  assert.equal(await page.evaluate(() => document.getElementById('elementshot-host').shadowRoot.querySelector('.box').style.display), 'none');
  await page.mouse.click(110, 110);
  assert.equal(await page.evaluate(() => window.clicks), 1);
  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { type: 'START_PICK' });
  });
  await page.mouse.move(130, 130);
  await page.waitForFunction(() => document.getElementById('elementshot-host').shadowRoot.querySelector('.badge').textContent.includes('button#child'));
  await page.mouse.wheel({ deltaY: -100 });
  await page.waitForFunction(() => document.getElementById('elementshot-host').shadowRoot.querySelector('.badge').textContent.includes('div#card'));
  await new Promise(resolve => setTimeout(resolve, 160));
  await page.mouse.wheel({ deltaY: 100 });
  await page.waitForFunction(() => document.getElementById('elementshot-host').shadowRoot.querySelector('.badge').textContent.includes('button#child'));
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  await page.keyboard.down('Shift');
  await page.mouse.move(105, 105); await page.mouse.down();
  await page.mouse.move(335, 255, { steps: 5 }); await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.waitForFunction(() => {
    const toast = document.getElementById('elementshot-host').shadowRoot.querySelector('.toast');
    return toast.classList.contains('visible') && toast.textContent.includes('Copied and saved') && toast.textContent.includes('_region_');
  }, { timeout: 15000 }).catch(async error => {
    console.error('Region capture feedback:', await page.evaluate(() => document.getElementById('elementshot-host').shadowRoot.querySelector('.toast').textContent));
    throw error;
  });
  const area = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const bitmap = await createImageBitmap(await item.getType('image/png'));
    return { width: bitmap.width, height: bitmap.height, clicks: window.clicks };
  });
  assert.equal(area.width, Math.round(230 * baselineBytes.readUInt32BE(16) / 1000));
  assert.equal(area.height, Math.round(150 * baselineBytes.readUInt32BE(20) / 700));
  assert.equal(area.clicks, 1);
  console.log('PASS: scroll expands/shrinks without page scrolling; Shift-drag copies a correctly sized custom PNG without triggering page clicks.');
  const options = await browser.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.waitForSelector('#save-btn');
  await options.click('label:has(#copyToClipboard) .slider'); await options.click('label:has(#saveToDisk) .slider'); await options.click('#save-btn');
  await options.waitForFunction(() => document.getElementById('status-toast').textContent.includes('Enable at least one'));
  console.log('PASS: loaded extension, real service worker capture/crop, native-scale PNG clipboard pixels, download, freeze, Enter, cleanup, options validation.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(temp, { recursive: true, force: true });
}
