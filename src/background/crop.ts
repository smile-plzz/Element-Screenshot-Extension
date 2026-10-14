import { CropRect } from '../common/types';
import { ViewportSize } from '../common/types';
import { scaleRectForDpr } from '../common/rect';

/**
 * Converts a Blob to a base64 Data URL using FileReader.
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`;
}

/**
 * Crops a full viewport screenshot data URL to the specified element rectangle,
 * scaling by DPR and respecting physical pixel boundaries.
 */
export async function cropScreenshot(
  viewportDataUrl: string,
  rect: CropRect,
  dpr: number,
  viewport?: ViewportSize
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
  const scale = viewport ? bitmap.width / viewport.width : dpr;
  const scaleY = viewport ? bitmap.height / viewport.height : dpr;
  const scaledRect = scaleRectForDpr(
    { ...rect, y: rect.y * scaleY / scale, height: rect.height * scaleY / scale }, scale, imageBounds
  );
  if (!scaledRect.width || !scaledRect.height) {
    bitmap.close();
    throw new Error('The selected element has no visible pixels');
  }

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

  bitmap.close();
  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  const croppedDataUrl = await blobToDataUrl(croppedBlob);

  return { croppedDataUrl, croppedBlob };
}
