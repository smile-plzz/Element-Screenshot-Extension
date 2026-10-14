import { CropRect } from '../common/types';
import { scaleRectForDpr } from '../common/rect';

/**
 * Converts a Blob to a base64 Data URL using FileReader.
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Crops a full viewport screenshot data URL to the specified element rectangle,
 * scaling by DPR and respecting physical pixel boundaries.
 */
export async function cropScreenshot(
  viewportDataUrl: string,
  rect: CropRect,
  dpr: number
): Promise<{ croppedDataUrl: string; croppedBlob: Blob }> {
  // Fetch dataUrl into a blob
  const response = await fetch(viewportDataUrl);
  const fullBlob = await response.blob();

  // Create ImageBitmap from blob (supported in modern Service Workers)
  const bitmap = await createImageBitmap(fullBlob);

  const imageBounds = {
    width: bitmap.width,
    height: bitmap.height,
  };

  // Scale and clamp crop rectangle against full image bounds
  const scaledRect = scaleRectForDpr(rect, dpr, imageBounds);

  // Render cropped slice using OffscreenCanvas
  const canvas = new OffscreenCanvas(scaledRect.width, scaledRect.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D context from OffscreenCanvas');
  }

  ctx.drawImage(
    bitmap,
    scaledRect.x,
    scaledRect.y,
    scaledRect.width,
    scaledRect.height,
    0,
    0,
    scaledRect.width,
    scaledRect.height
  );

  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  const croppedDataUrl = await blobToDataUrl(croppedBlob);

  return { croppedDataUrl, croppedBlob };
}
