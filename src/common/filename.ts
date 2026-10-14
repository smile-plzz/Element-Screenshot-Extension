import { ElementMeta } from './types';

/**
 * Sanitizes a string to be safely used in a filesystem filename.
 * Removes forbidden characters: < > : " / \ | ? * and control codes.
 */
export function sanitizeFilenamePart(part: string): string {
  if (!part) return '';
  return part
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * Sanitizes a subfolder name to prevent directory traversal.
 */
export function sanitizeSubfolder(subfolder: string): string {
  if (!subfolder) return 'ElementShots';
  const clean = subfolder
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*\x00-\x1F]/g, '')
    .replace(/^[/\\]+|[/\\]+$/g, '')
    .trim();
  return clean || 'ElementShots';
}

/**
 * Formats a Date object into YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object into HH-mm-ss.
 */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}-${m}-${s}`;
}

/**
 * Resolves a filename template with context metadata.
 */
export function generateFilename(
  template: string,
  meta: ElementMeta,
  date: Date = new Date()
): string {
  const domainPart = sanitizeFilenamePart(meta.domain || 'page').toLowerCase();
  const tagPart = sanitizeFilenamePart((meta.tagName || 'element').toLowerCase());
  const classPart = sanitizeFilenamePart(
    (meta.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('-')
  );
  const idPart = sanitizeFilenamePart(meta.id || '');
  const titlePart = sanitizeFilenamePart((meta.pageTitle || '').slice(0, 30));
  const datePart = formatDate(date);
  const timePart = formatTime(date);

  const raw = (template || '{domain}_{tag}_{date}_{time}')
    .replace(/\{domain\}/g, domainPart || 'page')
    .replace(/\{tag\}/g, tagPart || 'element')
    .replace(/\{class\}/g, classPart || 'noclass')
    .replace(/\{id\}/g, idPart || 'noid')
    .replace(/\{title\}/g, titlePart || 'untitled')
    .replace(/\{date\}/g, datePart)
    .replace(/\{time\}/g, timePart);

  const sanitized = sanitizeFilenamePart(raw) || `elementshot-${datePart}-${timePart}`;
  return `${sanitized}.png`;
}
