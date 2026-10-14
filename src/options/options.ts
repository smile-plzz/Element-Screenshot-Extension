import { loadSettings, saveSettings, resetSettings } from '../common/storage';
import { generateFilename, sanitizeSubfolder } from '../common/filename';
import { ExtensionSettings } from '../common/types';

const form = document.getElementById('settings-form') as HTMLFormElement;
const copyToClipboardInput = document.getElementById('copyToClipboard') as HTMLInputElement;
const saveToDiskInput = document.getElementById('saveToDisk') as HTMLInputElement;
const subfolderInput = document.getElementById('subfolder') as HTMLInputElement;
const filenameTemplateInput = document.getElementById('filenameTemplate') as HTMLInputElement;
const filenamePreview = document.getElementById('filename-preview') as HTMLElement;
const paddingInput = document.getElementById('padding') as HTMLInputElement;
const paddingVal = document.getElementById('padding-val') as HTMLElement;
const stayInPickModeInput = document.getElementById('stayInPickMode') as HTMLInputElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const openShortcutsBtn = document.getElementById('open-shortcuts') as HTMLButtonElement;
const toastNotice = document.getElementById('status-toast') as HTMLElement;

let toastTimer: number | null = null;

function showToast(message: string) {
  if (toastTimer) window.clearTimeout(toastTimer);
  toastNotice.textContent = message;
  toastNotice.classList.add('show');
  toastTimer = window.setTimeout(() => {
    toastNotice.classList.remove('show');
  }, 2500);
}

function updatePreview() {
  const sampleMeta = {
    domain: 'example.com',
    tagName: 'DIV',
    id: 'hero-banner',
    className: 'card highlighted',
    pageTitle: 'Sample Documentation',
    pageUrl: 'https://example.com/docs',
  };
  const template = filenameTemplateInput.value || '{domain}_{tag}_{date}_{time}';
  filenamePreview.textContent = generateFilename(template, sampleMeta);
}

function renderSettings(settings: ExtensionSettings) {
  copyToClipboardInput.checked = settings.copyToClipboard;
  saveToDiskInput.checked = settings.saveToDisk;
  subfolderInput.value = settings.subfolder;
  filenameTemplateInput.value = settings.filenameTemplate;
  paddingInput.value = String(settings.padding);
  paddingVal.textContent = `${settings.padding} px`;
  stayInPickModeInput.checked = settings.stayInPickMode;
  updatePreview();
}

async function init() {
  const settings = await loadSettings();
  renderSettings(settings);

  paddingInput.addEventListener('input', () => {
    paddingVal.textContent = `${paddingInput.value} px`;
  });

  filenameTemplateInput.addEventListener('input', updatePreview);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newSettings: ExtensionSettings = {
      copyToClipboard: copyToClipboardInput.checked,
      saveToDisk: saveToDiskInput.checked,
      subfolder: sanitizeSubfolder(subfolderInput.value),
      filenameTemplate: filenameTemplateInput.value.trim() || '{domain}_{tag}_{date}_{time}',
      padding: parseInt(paddingInput.value, 10) || 0,
      stayInPickMode: stayInPickModeInput.checked,
      includeTimestamp: true,
    };

    await saveSettings(newSettings);
    renderSettings(newSettings);
    showToast('Settings saved successfully');
  });

  resetBtn.addEventListener('click', async () => {
    const defaults = await resetSettings();
    renderSettings(defaults);
    showToast('Reset to default settings');
  });

  openShortcutsBtn.addEventListener('click', () => {
    if (chrome && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }
  });
}

init().catch((err) => {
  console.error('ElementShot: Failed to initialize options page:', err);
});
