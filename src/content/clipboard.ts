/**
 * Converts a data URL to a Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(parts[1]);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Writes an image Blob to the system clipboard using the standard Clipboard API.
 * Returns true if successful, false otherwise.
 */
export async function writeImageBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.write) {
      return false;
    }

    const item = new ClipboardItem({ [blob.type || 'image/png']: blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.warn('ElementShot: Direct clipboard write failed:', err);
    return false;
  }
}
