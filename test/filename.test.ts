import { describe, it, expect } from 'vitest';
import {
  sanitizeFilenamePart,
  sanitizeSubfolder,
  formatDate,
  formatTime,
  generateFilename,
} from '../src/common/filename';

describe('filename sanitization and template generation', () => {
  it('strips illegal characters from filename parts', () => {
    const dirty = 'invalid/name:with*bad?"chars|and<arrows>';
    const clean = sanitizeFilenamePart(dirty);
    expect(clean).not.toMatch(/[<>:"/\\|?*]/);
    expect(clean).toBe('invalid-name-with-bad-chars-and-arrows');
  });

  it('collapses multiple hyphens and whitespace', () => {
    const input = '   hello    world---test   ';
    expect(sanitizeFilenamePart(input)).toBe('hello-world-test');
  });

  it('sanitizes subfolders to prevent directory traversal', () => {
    expect(sanitizeSubfolder('../../secret/folder')).toBe('secret/folder');
    expect(sanitizeSubfolder('/MyShots/')).toBe('MyShots');
    expect(sanitizeSubfolder('')).toBe('ElementShots');
  });

  it('formats dates and times with padded zeros', () => {
    const fixedDate = new Date(2026, 9, 14, 8, 5, 9); // Month is 0-indexed (9 = Oct)
    expect(formatDate(fixedDate)).toBe('2026-10-14');
    expect(formatTime(fixedDate)).toBe('08-05-09');
  });

  it('replaces template tokens with sanitized metadata', () => {
    const meta = {
      tagName: 'DIV',
      id: 'main-header',
      className: 'card highlighted',
      domain: 'github.com',
      pageTitle: 'Project Documentation',
      pageUrl: 'https://github.com/docs',
    };
    const date = new Date(2026, 9, 14, 15, 30, 0);

    const filename = generateFilename('{domain}_{tag}_{class}_{date}_{time}', meta, date);
    expect(filename).toBe('github.com_div_card-highlighted_2026-10-14_15-30-00.png');
  });

  it('falls back gracefully when metadata fields are missing or empty', () => {
    const meta = {
      tagName: '',
      domain: '',
      pageTitle: '',
      pageUrl: '',
    };
    const date = new Date(2026, 9, 14, 12, 0, 0);

    const filename = generateFilename('{domain}_{tag}_{date}', meta, date);
    expect(filename).toBe('page_element_2026-10-14.png');
  });
});
