import { describe, it, expect, vi, afterEach } from 'vitest';
import { blobToDataUrl, cropScreenshot } from '../src/background/crop';
import { generateFilename, sanitizeFilenamePart, sanitizeSubfolder } from '../src/common/filename';
import { normalizeSettings } from '../src/common/storage';
import { isRestrictedUrl } from '../src/common/urls';
import { scaleRectForDpr } from '../src/common/rect';

afterEach(() => vi.unstubAllGlobals());

describe('release regressions', () => {
  it('encodes binary PNG data in a worker without FileReader', async () => {
    vi.stubGlobal('FileReader', undefined);
    const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 128]);
    expect(await blobToDataUrl(new Blob([bytes], { type: 'image/png' }))).toBe('data:image/png;base64,iVBORwD/gA==');
  });

  it('encodes large blobs without exceeding function argument limits', async () => {
    const bytes = new Uint8Array(200000).fill(255);
    const result = await blobToDataUrl(new Blob([bytes], { type: 'image/png' }));
    expect(atob(result.split(',')[1]).length).toBe(bytes.length);
  });

  it('uses actual screenshot scale rather than assuming the reported DPR', async () => {
    const drawImage = vi.fn();
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1600, height: 1200, close })));
    vi.stubGlobal('OffscreenCanvas', class {
      getContext() { return { drawImage }; }
      async convertToBlob() { return new Blob([new Uint8Array([1])], { type: 'image/png' }); }
    });
    const result = await cropScreenshot('data:image/png;base64,AQ==', { x: 10, y: 20, width: 100, height: 50 }, 3, { width: 800, height: 600 });
    expect(drawImage.mock.calls[0].slice(1)).toEqual([20, 40, 200, 100, 0, 0, 200, 100]);
    expect(close).toHaveBeenCalledOnce();
    expect(result.croppedDataUrl).toBe('data:image/png;base64,AQ==');
  });

  it('supports browser zoom out with DPR below one', () => {
    expect(scaleRectForDpr({ x: 10, y: 20, width: 100, height: 80 }, 0.75, { width: 600, height: 450 }))
      .toEqual({ x: 8, y: 15, width: 75, height: 60 });
  });

  it('keeps physical crops inside image bounds even for out-of-range input', () => {
    const rect = scaleRectForDpr({ x: 9999, y: 9999, width: 10, height: 10 }, 2, { width: 100, height: 100 });
    expect(rect.x + rect.width).toBeLessThanOrEqual(100);
    expect(rect.y + rect.height).toBeLessThanOrEqual(100);
  });

  it('prevents reserved Windows filenames and nested traversal', () => {
    expect(sanitizeFilenamePart('CON')).toBe('_CON');
    expect(sanitizeFilenamePart('NUL.txt')).toBe('_NUL.txt');
    expect(sanitizeFilenamePart('photo. ')).toBe('photo');
    expect(sanitizeSubfolder('..\\Shots\\.\\..\\NUL')).toBe('Shots/_NUL');
    expect(sanitizeFilenamePart('a'.repeat(1000)).length).toBeLessThanOrEqual(160);
  });

  it('resolves the sequence token', () => {
    expect(generateFilename('{tag}-{n}', { tagName: 'DIV', domain: '', pageTitle: '', pageUrl: '' }, new Date(), 7)).toBe('div-7.png');
  });

  it('restricts store hosts without blocking ordinary URLs that mention them', () => {
    expect(isRestrictedUrl('https://example.com/?url=chromewebstore.google.com')).toBe(false);
    expect(isRestrictedUrl('https://microsoftedge.microsoft.com/addons/detail/abc')).toBe(true);
    expect(isRestrictedUrl('javascript:alert(1)')).toBe(true);
    expect(isRestrictedUrl('moz-extension://test/options.html')).toBe(true);
  });

  it('normalizes corrupted settings and retains an output destination', () => {
    expect(normalizeSettings({ padding: NaN }).padding).toBe(0);
    expect(normalizeSettings({ padding: 500 }).padding).toBe(50);
    expect(normalizeSettings({ copyToClipboard: false, saveToDisk: false }).saveToDisk).toBe(true);
    expect(normalizeSettings({ padding: -5 }).padding).toBe(0);
  });
});
