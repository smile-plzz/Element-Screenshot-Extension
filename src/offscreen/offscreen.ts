import { dataUrlToBlob, writeImageBlobToClipboard } from '../content/clipboard';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'WRITE_CLIPBOARD_OFFSCREEN') {
    const dataUrl = message.payload?.dataUrl;
    if (!dataUrl) {
      sendResponse({ success: false, error: 'No data URL provided' });
      return true;
    }

    try {
      const blob = dataUrlToBlob(dataUrl);
      writeImageBlobToClipboard(blob).then((success) => {
        sendResponse({ success });
      }).catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }

    return true; // Keep message channel open for async response
  }
});
