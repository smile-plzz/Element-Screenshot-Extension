import { ExtensionSettings, DEFAULT_SETTINGS } from './types';

/**
 * Loads extension settings from chrome.storage.sync with fallback to local.
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve({ ...DEFAULT_SETTINGS });
      return;
    }

    const storageArea = chrome.storage.sync || chrome.storage.local;
    storageArea.get(DEFAULT_SETTINGS, (items) => {
      if (chrome.runtime.lastError) {
        // Fallback to local if sync encountered an error
        if (chrome.storage.local) {
          chrome.storage.local.get(DEFAULT_SETTINGS, (localItems) => {
            resolve({ ...DEFAULT_SETTINGS, ...localItems });
          });
          return;
        }
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }
      resolve({ ...DEFAULT_SETTINGS, ...items });
    });
  });
}

/**
 * Saves extension settings to chrome.storage.sync with fallback to local.
 */
export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve();
      return;
    }

    const storageArea = chrome.storage.sync || chrome.storage.local;
    storageArea.set(settings, () => {
      if (chrome.runtime.lastError) {
        if (chrome.storage.local) {
          chrome.storage.local.set(settings, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
          return;
        }
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

/**
 * Resets settings back to DEFAULT_SETTINGS.
 */
export async function resetSettings(): Promise<ExtensionSettings> {
  await saveSettings(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}
