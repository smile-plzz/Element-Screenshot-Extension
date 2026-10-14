import { Picker } from './picker';
import { loadSettings } from '../common/storage';
import { ExtensionMessage } from '../common/types';
import { dataUrlToBlob, writeImageBlobToClipboard } from './clipboard';

declare global {
  interface Window {
    __ELEMENTSHOT_PICKER__?: Picker;
  }
}

async function main() {
  if (window.__ELEMENTSHOT_PICKER__) {
    // Already loaded, toggle state
    if (window.__ELEMENTSHOT_PICKER__.isActive()) {
      window.__ELEMENTSHOT_PICKER__.stop();
    } else {
      const settings = await loadSettings();
      window.__ELEMENTSHOT_PICKER__.updateSettings(settings);
      window.__ELEMENTSHOT_PICKER__.start();
    }
    return;
  }

  const initialSettings = await loadSettings();
  const picker = new Picker(initialSettings, () => {
    // Cleanup callback
  });
  window.__ELEMENTSHOT_PICKER__ = picker;

  // Start immediately upon initial dynamic injection
  picker.start();

  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'TOGGLE_PICK_MODE') {
      if (picker.isActive()) {
        picker.stop();
      } else {
        loadSettings().then((s) => {
          picker.updateSettings(s);
          picker.start();
        });
      }
      sendResponse({ status: 'ok' });
      return true;
    }

    if (message.type === 'START_PICK') {
      loadSettings().then((s) => {
        picker.updateSettings(s);
        picker.start();
      });
      sendResponse({ status: 'ok' });
      return true;
    }

    if (message.type === 'STOP_PICK') {
      picker.stop();
      sendResponse({ status: 'ok' });
      return true;
    }

    if (message.type === 'WRITE_CLIPBOARD') {
      const blob = dataUrlToBlob(message.payload.dataUrl);
      writeImageBlobToClipboard(blob).then((success) => {
        sendResponse({ success });
      });
      return true; // Keep message channel open for async response
    }
  });
}

main().catch((err) => {
  console.error('ElementShot: Failed to initialize content script:', err);
});
