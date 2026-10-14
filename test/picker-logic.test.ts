// @vitest-environment happy-dom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Picker } from '../src/content/picker';
import { DEFAULT_SETTINGS } from '../src/common/types';

let picker: Picker;
let card: HTMLElement;
let child: HTMLElement;
let send: ReturnType<typeof vi.fn>;
const shadow = () => document.getElementById('elementshot-host')!.shadowRoot!;
const key = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
const click = () => child.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
const rect = { x: 100, y: 100, left: 100, top: 100, width: 240, height: 160, right: 340, bottom: 260, toJSON: () => ({}) };

beforeEach(() => {
  document.body.innerHTML = '<div id="card"><button id="child">Capture</button></div>';
  document.documentElement.style.cursor = 'help';
  card = document.getElementById('card')!;
  child = document.getElementById('child')!;
  vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(rect);
  vi.spyOn(child, 'getBoundingClientRect').mockReturnValue({ ...rect, width: 80, height: 40 });
  send = vi.fn(async () => ({ success: true, saved: true, copied: true, filename: 'test.png' }));
  vi.stubGlobal('chrome', { runtime: { sendMessage: send } });
  picker = new Picker({ ...DEFAULT_SETTINGS });
  picker.start();
});
afterEach(() => {
  picker.stop(); picker.getOverlay().destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('real picker behavior', () => {
  it('restores page cursor and removes click interception on cancel', () => {
    key('Escape');
    expect(picker.isActive()).toBe(false);
    expect(document.documentElement.style.cursor).toBe('help');
    expect(click()).toBe(true);
  });
  it('selects parent and restores child through keyboard traversal', () => {
    child.focus(); picker.stop(); picker.start();
    key('ArrowUp');
    expect(shadow().querySelector('.badge')!.textContent).toContain('div#card');
    key('ArrowDown');
    expect(shadow().querySelector('.badge')!.textContent).toContain('button#child');
  });
  it('does not interpret a page-controlled ID as overlay HTML', () => {
    card.id = '<img src=x onerror=alert(1)>';
    picker.stop(); picker.start();
    expect(shadow().querySelector('.badge img')).toBeNull();
    expect(shadow().querySelector('.badge')!.textContent).toContain('<img');
  });
  it('hides the full overlay during capture and blocks page click handlers', async () => {
    const pageClick = vi.fn(); child.addEventListener('click', pageClick);
    send.mockImplementation(async () => {
      expect(document.getElementById('elementshot-host')!.style.visibility).toBe('hidden');
      return { success: true, saved: true, copied: true, filename: 'test.png' };
    });
    expect(click()).toBe(false);
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(picker.isActive()).toBe(false));
    expect(pageClick).not.toHaveBeenCalled();
    expect(shadow().querySelector('.toast')!.textContent).toBe('Copied and saved: test.png');
    expect(shadow().querySelector('.toast')!.classList.contains('success')).toBe(true);
  });
  it('captures with Enter and reports clipboard failure without hiding save success', async () => {
    send.mockResolvedValue({ success: true, saved: true, copied: false, filename: 'test.png' });
    key('Enter');
    await vi.waitFor(() => expect(picker.isActive()).toBe(false));
    expect(shadow().querySelector('.toast')!.textContent).toContain('Clipboard failed');
    expect(shadow().querySelector('.toast')!.classList.contains('warn')).toBe(true);
  });
  it('prevents duplicate in-flight captures', async () => {
    click(); click(); key('Enter');
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
  });
  it('does not revive result UI after cancellation', async () => {
    let resolve!: (value: unknown) => void;
    send.mockImplementation(() => new Promise(r => { resolve = r; }));
    click();
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    key('Escape'); resolve({ success: true, saved: true, copied: true });
    await new Promise(r => setTimeout(r, 10));
    expect(picker.isActive()).toBe(false);
    expect(shadow().querySelector('.toast')!.textContent).toBe('Pick mode cancelled');
  });
  it('rejects invisible selections before sending a capture request', () => {
    vi.mocked(card.getBoundingClientRect).mockReturnValue({ ...rect, width: 0, height: 0 });
    click();
    expect(send).not.toHaveBeenCalled();
    expect(shadow().querySelector('.toast')!.textContent).toContain('no visible pixels');
  });
});
