import { ExtensionSettings, DEFAULT_SETTINGS } from './types';

export function normalizeSettings(items: Partial<ExtensionSettings>): ExtensionSettings {
  const result = { ...DEFAULT_SETTINGS };
  for (const key of ['saveToDisk', 'copyToClipboard', 'stayInPickMode', 'includeTimestamp'] as const) {
    if (typeof items[key] === 'boolean') result[key] = items[key];
  }
  for (const key of ['subfolder', 'filenameTemplate'] as const) {
    if (typeof items[key] === 'string') result[key] = items[key].slice(0, 200);
  }
  if (typeof items.padding === 'number' && Number.isFinite(items.padding)) result.padding = Math.max(0, Math.min(50, Math.round(items.padding)));
  if (!result.copyToClipboard && !result.saveToDisk) result.saveToDisk = true;
  return result;
}

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
            resolve(normalizeSettings(localItems));
          });
          return;
        }
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }
      resolve(normalizeSettings(items));
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
