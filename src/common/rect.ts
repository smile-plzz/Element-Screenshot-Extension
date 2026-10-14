import { CropRect, ViewportSize } from './types';

/**
 * Expands a rectangle by a specified padding in CSS pixels.
 */
export function expandRectWithPadding(rect: CropRect, padding: number): CropRect {
  if (padding <= 0) return { ...rect };
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

/**
 * Clamps a rectangle to the visible viewport boundaries and determines
 * if the capture is partial (extends beyond the viewport).
 */
export function clampRectToViewport(
  rect: CropRect,
  viewport: ViewportSize
): { clampedRect: CropRect; isPartial: boolean } {
  const isOutOfLeft = rect.x < 0;
  const isOutOfTop = rect.y < 0;
  const isOutOfRight = rect.x + rect.width > viewport.width;
  const isOutOfBottom = rect.y + rect.height > viewport.height;

  const isPartial = isOutOfLeft || isOutOfTop || isOutOfRight || isOutOfBottom;

  const left = Math.max(0, rect.x);
  const top = Math.max(0, rect.y);
  const right = Math.min(viewport.width, rect.x + rect.width);
  const bottom = Math.min(viewport.height, rect.y + rect.height);

  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  return {
    clampedRect: {
      x: left,
      y: top,
      width,
      height,
    },
    isPartial,
  };
}

/**
 * Scales a CSS pixel rectangle to physical screen pixels using devicePixelRatio (DPR).
 * Keeps floating point precision until final clamp against the full captured image bounds.
 */
export function scaleRectForDpr(
  rect: CropRect,
  dpr: number,
  imageBounds: { width: number; height: number }
): CropRect {
  const safeDpr = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;

  // Scaled coordinates
  const rawX = Math.round(rect.x * safeDpr);
  const rawY = Math.round(rect.y * safeDpr);
  const rawW = Math.round(rect.width * safeDpr);
  const rawH = Math.round(rect.height * safeDpr);

  // Ensure coordinates stay strictly within image bounds
  const x = Math.max(0, Math.min(rawX, Math.max(0, imageBounds.width - 1)));
  const y = Math.max(0, Math.min(rawY, Math.max(0, imageBounds.height - 1)));
  const width = Math.max(1, Math.min(rawW, imageBounds.width - x));
  const height = Math.max(1, Math.min(rawH, imageBounds.height - y));

  return { x, y, width, height };
}
