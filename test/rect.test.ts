import { describe, it, expect } from 'vitest';
import { expandRectWithPadding, clampRectToViewport, scaleRectForDpr } from '../src/common/rect';

describe('rect math and utilities', () => {
  it('expands rect with positive padding', () => {
    const original = { x: 50, y: 50, width: 100, height: 100 };
    const expanded = expandRectWithPadding(original, 10);
    expect(expanded).toEqual({
      x: 40,
      y: 40,
      width: 120,
      height: 120,
    });
  });

  it('keeps rect unchanged when padding is 0 or negative', () => {
    const original = { x: 50, y: 50, width: 100, height: 100 };
    expect(expandRectWithPadding(original, 0)).toEqual(original);
    expect(expandRectWithPadding(original, -5)).toEqual(original);
  });

  it('identifies completely inside rect as not partial', () => {
    const rect = { x: 10, y: 20, width: 200, height: 150 };
    const viewport = { width: 1000, height: 800 };
    const { clampedRect, isPartial } = clampRectToViewport(rect, viewport);

    expect(isPartial).toBe(false);
    expect(clampedRect).toEqual(rect);
  });

  it('clamps and marks rect as partial when extending beyond right or bottom boundary', () => {
    const rect = { x: 900, y: 700, width: 200, height: 200 };
    const viewport = { width: 1000, height: 800 };
    const { clampedRect, isPartial } = clampRectToViewport(rect, viewport);

    expect(isPartial).toBe(true);
    expect(clampedRect).toEqual({
      x: 900,
      y: 700,
      width: 100,
      height: 100,
    });
  });

  it('clamps and marks rect as partial when extending before left or top boundary', () => {
    const rect = { x: -30, y: -20, width: 100, height: 100 };
    const viewport = { width: 800, height: 600 };
    const { clampedRect, isPartial } = clampRectToViewport(rect, viewport);

    expect(isPartial).toBe(true);
    expect(clampedRect).toEqual({
      x: 0,
      y: 0,
      width: 70,
      height: 80,
    });
  });

  it('scales rect accurately for HiDPI devicePixelRatio (2x)', () => {
    const cssRect = { x: 100, y: 50, width: 200, height: 150 };
    const imageBounds = { width: 800, height: 600 };
    const scaled = scaleRectForDpr(cssRect, 2, imageBounds);

    expect(scaled).toEqual({
      x: 200,
      y: 100,
      width: 400,
      height: 300,
    });
  });

  it('prevents scaled rect from overflowing image bounds', () => {
    const cssRect = { x: 350, y: 250, width: 200, height: 200 };
    const imageBounds = { width: 800, height: 600 };
    const scaled = scaleRectForDpr(cssRect, 2, imageBounds);

    expect(scaled.x).toBe(700);
    expect(scaled.y).toBe(500);
    expect(scaled.x + scaled.width).toBeLessThanOrEqual(imageBounds.width);
    expect(scaled.y + scaled.height).toBeLessThanOrEqual(imageBounds.height);
    expect(scaled.width).toBe(100);
    expect(scaled.height).toBe(100);
  });
});
