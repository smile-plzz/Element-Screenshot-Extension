import { describe, it, expect } from 'vitest';
import { scaleRectForDpr, clampRectToViewport, expandRectWithPadding } from '../src/common/rect';

describe('end-to-end crop geometry and pipeline calculation', () => {
  it('handles sub-pixel coordinates gracefully and rounds to physical pixels', () => {
    const rect = { x: 12.333, y: 45.666, width: 100.4, height: 200.7 };
    const dpr = 2.5;
    const imageBounds = { width: 1920, height: 1080 };

    const scaled = scaleRectForDpr(rect, dpr, imageBounds);
    expect(scaled.x).toBe(Math.round(12.333 * 2.5));
    expect(scaled.y).toBe(Math.round(45.666 * 2.5));
    expect(scaled.width).toBe(Math.round(100.4 * 2.5));
    expect(scaled.height).toBe(Math.round(200.7 * 2.5));
  });

  it('correctly calculates full pipeline: padding -> viewport clamp -> DPR scaling', () => {
    // 1. Initial DOM bounding box
    const domRect = { x: 50, y: 10, width: 300, height: 200 };
    const padding = 20;
    const viewport = { width: 400, height: 300 };
    const dpr = 2;
    const imageBounds = { width: 800, height: 600 };

    // Step A: Expand with padding
    const expanded = expandRectWithPadding(domRect, padding);
    expect(expanded).toEqual({ x: 30, y: -10, width: 340, height: 240 });

    // Step B: Clamp to viewport and detect partial status
    const { clampedRect, isPartial } = clampRectToViewport(expanded, viewport);
    expect(isPartial).toBe(true); // Y was negative, so partial capture
    expect(clampedRect).toEqual({
      x: 30,
      y: 0,
      width: 340,
      height: 230,
    });

    // Step C: Scale for DPR (2x)
    const finalCrop = scaleRectForDpr(clampedRect, dpr, imageBounds);
    expect(finalCrop).toEqual({
      x: 60,
      y: 0,
      width: 680,
      height: 460,
    });
  });

  it('guarantees min dimensions of 1x1 even if zero-sized element is clicked', () => {
    const emptyRect = { x: 10, y: 10, width: 0, height: 0 };
    const scaled = scaleRectForDpr(emptyRect, 2, { width: 100, height: 100 });
    expect(scaled.width).toBeGreaterThanOrEqual(1);
    expect(scaled.height).toBeGreaterThanOrEqual(1);
  });
});
