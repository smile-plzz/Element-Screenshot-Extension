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
async function ensureOffscreenDocument(): Promise<void> {
  if (!chrome.offscreen) return;
  try {
    const hasDoc = await chrome.offscreen.hasDocument?.();
    if (!hasDoc) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Copy captured screenshot to system clipboard',
      });
    }
  } catch (err) {
    console.warn('ElementShot: Offscreen document creation notice:', err);
  }
}

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

// Handle capture requests and background messaging
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'CAPTURE_REQUEST') {
    const payload = message.payload as CaptureRequestPayload;
    const tabId = sender.tab?.id;
    const windowId = sender.tab?.windowId;

    (async () => {
      try {
        const settings = await loadSettings();

        // Step 1: Capture the visible tab viewport
        const viewportDataUrl =
          windowId !== undefined
            ? await chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
            : await chrome.tabs.captureVisibleTab({ format: 'png' });

        // Step 2: Crop image according to DPR and clamp math
        const { croppedDataUrl } = await cropScreenshot(
          viewportDataUrl,
          payload.rect,
          payload.dpr
        );

        let saved = false;
        let copied = false;
        let finalFilename = '';

        // Step 3: Handle saving to disk if enabled
        if (settings.saveToDisk) {
          const folder = sanitizeSubfolder(settings.subfolder);
          finalFilename = generateFilename(settings.filenameTemplate, payload.meta);
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
          success: true,
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
      }
    })();

    return true; // Keep message channel open for async response
  }
});
