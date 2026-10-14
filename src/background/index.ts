declare const browser: { clipboard?: { setImageData: (bytes: ArrayBuffer, type: 'png') => Promise<void> } } | undefined;
import { cropScreenshot } from './crop';
import { generateFilename, sanitizeSubfolder } from '../common/filename';
import { loadSettings } from '../common/storage';
import {
  CaptureRequestPayload,
  CaptureResponsePayload,
  ExtensionMessage,
} from '../common/types';

import { isRestrictedUrl } from '../common/urls';

/**
 * Ensures an offscreen document is active for clipboard operations.
 */
let offscreenCreation: Promise<void> | undefined;
async function ensureOffscreenDocument(): Promise<void> {
  if (!chrome.offscreen) throw new Error('Offscreen clipboard unavailable');
  if (!offscreenCreation) {
    offscreenCreation = (async () => {
      if (!await chrome.offscreen.hasDocument()) await chrome.offscreen.createDocument({
        url: 'offscreen.html', reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification: 'Copy captured screenshot to system clipboard',
      });
    })().finally(() => { offscreenCreation = undefined; });
  }
  await offscreenCreation;
}

let captureBusy = false;
let lastCaptureTime = 0;
let sequence = 0;

/**
 * Injects or toggles pick mode on the specified tab.
 */
async function togglePickModeOnTab(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) return;

  if (isRestrictedUrl(tab.url)) {
    console.warn('ElementShot: Cannot run on restricted system pages.');
    if (chrome.action?.setBadgeText) {
      chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
      chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#ef4444' });
      chrome.action.setTitle({
        tabId: tab.id,
        title: 'ElementShot cannot run on restricted system pages (browser settings, store, etc.)',
      });
      setTimeout(() => {
        if (tab.id) {
          chrome.action.setBadgeText({ tabId: tab.id, text: '' });
          chrome.action.setTitle({
            tabId: tab.id,
            title: 'ElementShot (Alt+Shift+S)',
          });
        }
      }, 3000);
    }
    return;
  }

  try {
    lastActiveTabId = tab.id;
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    // Attempt sending message if content script is already injected
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PICK_MODE' });
  } catch {
    // If sendMessage fails, inject content script on demand
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
    } catch (err) {
      console.error('ElementShot: Failed to inject content script:', err);
      await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
      await chrome.action.setTitle({ tabId: tab.id, title: 'Cannot capture this page. For local files, enable Allow access to file URLs in extension settings.' });
    }
  }
}

// Handle extension toolbar button click
chrome.action.onClicked.addListener(async (tab) => {
  await togglePickModeOnTab(tab);
});

// Handle keyboard shortcuts (commands)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-pick-mode') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      await togglePickModeOnTab(activeTab);
    }
  }
});

// Clean up pick mode on previous tab when switching tabs
let lastActiveTabId: number | null = null;
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (lastActiveTabId && lastActiveTabId !== activeInfo.tabId) {
    try {
      await chrome.tabs.sendMessage(lastActiveTabId, { type: 'STOP_PICK' });
    } catch {
      // Ignore tabs without content script or closed tabs
    }
  }
  lastActiveTabId = activeInfo.tabId;
});

// Handle capture requests and background messaging
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'CAPTURE_REQUEST') {
    const payload = message.payload as CaptureRequestPayload;
    const tabId = sender.tab?.id;
    const windowId = sender.tab?.windowId;

    if (captureBusy) { sendResponse({ success: false, saved: false, copied: false, error: 'A capture is already running. Please try again.' }); return; }
    captureBusy = true;
    (async () => {
      try {
        if (sender.id !== chrome.runtime.id || tabId === undefined || windowId === undefined || sender.frameId !== 0) throw new Error('Invalid capture sender');
        const [activeTab] = await chrome.tabs.query({ active: true, windowId });
        if (activeTab?.id !== tabId) throw new Error('Tab changed. Return to the selected page and try again.');
        if (!payload?.rect || !payload.viewport || ![payload.rect.x, payload.rect.y, payload.rect.width, payload.rect.height, payload.viewport.width, payload.viewport.height].every(Number.isFinite) || payload.rect.width <= 0 || payload.rect.height <= 0 || payload.viewport.width <= 0 || payload.viewport.height <= 0) throw new Error('Invalid capture dimensions');
        const settings = await loadSettings();
        if (!settings.copyToClipboard && !settings.saveToDisk) throw new Error('Enable clipboard or saving in extension settings');

        const wait = Math.max(0, 600 - (Date.now() - lastCaptureTime));
        if (wait) await new Promise(resolve => setTimeout(resolve, wait));
        const [stillActive] = await chrome.tabs.query({ active: true, windowId });
        if (stillActive?.id !== tabId) throw new Error('Tab changed before capture');
        lastCaptureTime = Date.now();
        // Step 1: Capture the visible tab viewport
        const viewportDataUrl =
          windowId !== undefined
            ? await chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
            : await chrome.tabs.captureVisibleTab({ format: 'png' });

        // Step 2: Crop image according to DPR and clamp math
        const { croppedDataUrl } = await cropScreenshot(
          viewportDataUrl,
          payload.rect,
          payload.dpr,
          payload.viewport
        );

        let saved = false;
        let copied = false;
        let finalFilename = '';

        // Step 3: Handle saving to disk if enabled
        if (settings.saveToDisk) {
          const folder = sanitizeSubfolder(settings.subfolder);
          finalFilename = generateFilename(settings.filenameTemplate, payload.meta, new Date(), ++sequence);
          const fullPath = `${folder}/${finalFilename}`;

          try {
            await chrome.downloads.download({
              url: croppedDataUrl,
              filename: fullPath,
              conflictAction: 'uniquify',
              saveAs: false,
            });
            saved = true;
          } catch (dlErr) {
            console.error('ElementShot: Download failed:', dlErr);
          }
        }

        // Step 4: Handle clipboard copy if enabled
        if (settings.copyToClipboard) {
          // Attempt 1: In content script via tab message
          if (tabId) {
            try {
              const res = await chrome.tabs.sendMessage(tabId, {
                type: 'WRITE_CLIPBOARD',
                payload: { dataUrl: croppedDataUrl },
              });
              if (res?.success) {
                copied = true;
              }
            } catch {
              // Content script write attempt fallback
            }
          }

          if (!copied && typeof browser !== 'undefined' && browser.clipboard?.setImageData) {
            try {
              const bytes = await (await fetch(croppedDataUrl)).arrayBuffer();
              await browser.clipboard.setImageData(bytes, 'png');
              copied = true;
            } catch (err) { console.warn('ElementShot: Firefox clipboard failed', err); }
          }
          // Attempt 2: Offscreen document fallback if direct write did not succeed
          if (!copied) {
            try {
              await ensureOffscreenDocument();
              const offscreenRes = await chrome.runtime.sendMessage({
                type: 'WRITE_CLIPBOARD_OFFSCREEN',
                payload: { dataUrl: croppedDataUrl },
              });
              if (offscreenRes?.success) {
                copied = true;
              }
            } catch (offscreenErr) {
              console.warn('ElementShot: Offscreen clipboard fallback notice:', offscreenErr);
            }
          }
        }

        const responsePayload: CaptureResponsePayload = {
          success: saved || copied,
          error: !saved && !copied ? 'Clipboard and saving failed. Check browser permissions.' : undefined,
          saved,
          copied,
          filename: finalFilename,
          isPartial: payload.isPartial,
        };

        sendResponse(responsePayload);
      } catch (err: unknown) {
        console.error('ElementShot: Background capture pipeline error:', err);
        const errMessage = err instanceof Error ? err.message : String(err);
        sendResponse({
          success: false,
          saved: false,
          copied: false,
          error: errMessage,
        });
      } finally { captureBusy = false; }
    })();

    return true; // Keep message channel open for async response
  }
});
