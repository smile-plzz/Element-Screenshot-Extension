import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSettings, saveSettings, resetSettings } from '../src/common/storage';
import { DEFAULT_SETTINGS } from '../src/common/types';

describe('storage module with mock chrome.storage', () => {
  let mockStore: Record<string, unknown> = {};

  beforeEach(() => {
    mockStore = {};
    (global as unknown as { chrome: unknown }).chrome = {
      storage: {
        sync: {
          get: vi.fn((defaults, callback) => {
            callback({ ...defaults, ...mockStore });
          }),
          set: vi.fn((items, callback) => {
            mockStore = { ...mockStore, ...items };
            if (callback) callback();
          }),
        },
        local: {
          get: vi.fn((defaults, callback) => {
            callback({ ...defaults, ...mockStore });
          }),
          set: vi.fn((items, callback) => {
            mockStore = { ...mockStore, ...items };
            if (callback) callback();
          }),
        },
      },
      runtime: {
        lastError: null,
      },
    };
  });

  it('loads default settings when storage is empty', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('saves and updates custom settings', async () => {
    await saveSettings({ subfolder: 'CustomCaptures', padding: 15 });
    const settings = await loadSettings();
    expect(settings.subfolder).toBe('CustomCaptures');
    expect(settings.padding).toBe(15);
    expect(settings.saveToDisk).toBe(true);
  });

  it('resets settings back to defaults', async () => {
    await saveSettings({ subfolder: 'Modified', padding: 40 });
    const reset = await resetSettings();
    expect(reset).toEqual(DEFAULT_SETTINGS);
  });
});
