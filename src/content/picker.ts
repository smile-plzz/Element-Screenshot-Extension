import { OverlayManager } from './overlay';
import { clampRectToViewport, expandRectWithPadding } from '../common/rect';
import {
  CaptureRequestPayload,
  CaptureResponsePayload,
  CropRect,
  ElementMeta,
  ExtensionSettings,
} from '../common/types';

/**
 * Finds the deepest element at (x, y), descending into open Shadow DOM roots.
 */
export function deepElementFromPoint(x: number, y: number): Element | null {
  let element = document.elementFromPoint(x, y);
  if (!element) return null;

  // Avoid inspecting our own host overlay
  if (element.id === 'elementshot-host') {
    return null;
  }

  // Walk open shadow roots recursively
  while (element && element.shadowRoot) {
    const shadowEl = element.shadowRoot.elementFromPoint(x, y);
    if (!shadowEl || shadowEl === element) {
      break;
    }
    element = shadowEl;
  }

  return element;
}

export class Picker {
  private active = false;
  private capturing = false;
  private previousCursor = '';
  private previousCursorPriority = '';
  private frame = 0;
  private blockHover = (event: Event) => { if (this.active && (this.isFrozen || this.capturing)) event.stopImmediatePropagation(); };
  private pointer = { x: 0, y: 0 };
  private isFrozen = false;
  private currentElement: Element | null = null;
  private childHistory: Element[] = [];
  private overlay: OverlayManager;
  private settings: ExtensionSettings;
  private onDeactivate?: () => void;

  constructor(settings: ExtensionSettings, onDeactivate?: () => void) {
    this.settings = settings;
    this.onDeactivate = onDeactivate;
    this.overlay = new OverlayManager();

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onScrollOrResize = this.onScrollOrResize.bind(this);
    this.onVisibilityOrUnload = this.onVisibilityOrUnload.bind(this);
  }

  public updateSettings(newSettings: ExtensionSettings) {
    this.settings = newSettings;
  }

  public start() {
    if (this.active || this.capturing) return;
    this.active = true;
    this.isFrozen = false;
    this.currentElement = null;
    this.childHistory = [];

    this.previousCursor = document.documentElement.style.cursor;
    this.previousCursorPriority = document.documentElement.style.getPropertyPriority('cursor');
    document.documentElement.style.setProperty('cursor', 'crosshair', 'important');
    this.currentElement = document.activeElement !== document.body ? document.activeElement : document.body?.firstElementChild;
    if (this.currentElement) this.highlightElement(this.currentElement);

    for (const name of ['pointerover', 'pointerout', 'mouseover', 'mouseout', 'pointermove']) window.addEventListener(name, this.blockHover, true);
    window.addEventListener('mousemove', this.onMouseMove, true);
    window.addEventListener('click', this.onClick, true);
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('scroll', this.onScrollOrResize, true);
    window.addEventListener('resize', this.onScrollOrResize, true);
    document.addEventListener('visibilitychange', this.onVisibilityOrUnload, true);
    window.addEventListener('beforeunload', this.onVisibilityOrUnload, true);
    window.addEventListener('pagehide', this.onVisibilityOrUnload, true);

    this.overlay.showToast('Pick mode active: Click an element or press Esc to cancel', 'success', 2500);
  }

  public stop() {
    if (!this.active) return;
    this.active = false;
    this.isFrozen = false;
    this.currentElement = null;
    this.childHistory = [];

    document.documentElement.style.setProperty('cursor', this.previousCursor, this.previousCursorPriority);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.overlay.hideToast();

    for (const name of ['pointerover', 'pointerout', 'mouseover', 'mouseout', 'pointermove']) window.removeEventListener(name, this.blockHover, true);
    window.removeEventListener('mousemove', this.onMouseMove, true);
    window.removeEventListener('click', this.onClick, true);
    window.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('scroll', this.onScrollOrResize, true);
    window.removeEventListener('resize', this.onScrollOrResize, true);
    document.removeEventListener('visibilitychange', this.onVisibilityOrUnload, true);
    window.removeEventListener('beforeunload', this.onVisibilityOrUnload, true);
    window.removeEventListener('pagehide', this.onVisibilityOrUnload, true);

    this.overlay.hideHighlight();
    this.overlay.setFrozen(false);

    if (this.onDeactivate) {
      this.onDeactivate();
    }
  }

  private onVisibilityOrUnload() {
    if (this.active) this.stop();
  }

  public isActive(): boolean {
    return this.active;
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.active || this.capturing) return;
    if (this.isFrozen) { e.stopImmediatePropagation(); return; }
    this.pointer = { x: e.clientX, y: e.clientY };
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (!this.active || this.capturing || this.isFrozen) return;
      const el = deepElementFromPoint(this.pointer.x, this.pointer.y);
      if (!el || el === this.currentElement) return;
      this.currentElement = el;
      this.childHistory = [];
      this.highlightElement(el);
    });
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.active) return;

    if (e.key === 'Enter' && this.currentElement) {
      e.preventDefault(); e.stopImmediatePropagation();
      void this.onClick(new MouseEvent('click'));
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.stop();
      this.overlay.showToast('Pick mode cancelled', 'warn', 1800);
      return;
    }

    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      e.stopPropagation();
      this.isFrozen = !this.isFrozen;
      this.overlay.setFrozen(this.isFrozen);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (!this.currentElement) return;

      const parent = this.currentElement.parentElement || (this.currentElement.getRootNode() instanceof ShadowRoot ? (this.currentElement.getRootNode() as ShadowRoot).host : null);
      if (parent && parent !== document.documentElement) {
        this.childHistory.push(this.currentElement);
        this.currentElement = parent;
        this.highlightElement(parent);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!this.currentElement) return;

      let targetChild: Element | null = null;
      if (this.childHistory.length > 0) {
        targetChild = this.childHistory.pop() || null;
      } else if (this.currentElement.firstElementChild) {
        targetChild = this.currentElement.firstElementChild;
      }

      if (targetChild) {
        this.currentElement = targetChild;
        this.highlightElement(targetChild);
      }
      return;
    }
  }

  private onScrollOrResize() {
    if (!this.active || !this.currentElement) return;
    this.highlightElement(this.currentElement);
  }

  private highlightElement(el: Element) {
    const rawRect = el.getBoundingClientRect();
    const rect: CropRect = {
      x: rawRect.left,
      y: rawRect.top,
      width: rawRect.width,
      height: rawRect.height,
    };

    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const firstClass = el.classList.length > 0 ? `.${el.classList[0]}` : '';
    const dimensions = `${Math.round(rawRect.width)} x ${Math.round(rawRect.height)}`;
    const label = `<${tag}${id}${firstClass}>  ${dimensions} | Click / Enter | Up / Down | F lock | Esc`;

    this.overlay.showHighlight(rect, label, this.isFrozen);
  }

  private async onClick(e: MouseEvent) {
    if (!this.active) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (this.capturing) return;
    const targetEl = this.currentElement || deepElementFromPoint(e.clientX, e.clientY);
    if (!targetEl || targetEl === document.documentElement) {
      return;
    }

    const rawRect = targetEl.getBoundingClientRect();
    const cssRect: CropRect = {
      x: rawRect.left,
      y: rawRect.top,
      width: rawRect.width,
      height: rawRect.height,
    };

    // Apply padding if configured
    const expandedRect = expandRectWithPadding(cssRect, this.settings.padding);

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const { clampedRect, isPartial } = clampRectToViewport(expandedRect, viewport);

    if (!clampedRect.width || !clampedRect.height || !targetEl.isConnected) {
      this.overlay.showToast('The selected element has no visible pixels. Choose another element.', 'warn');
      return;
    }
    this.capturing = true;
    let feedback = '';
    let feedbackType: 'success' | 'warn' | 'error' = 'success';
    const meta: ElementMeta = {
      tagName: targetEl.tagName,
      id: targetEl.id,
      className: targetEl.className && typeof targetEl.className === 'string' ? targetEl.className : '',
      domain: window.location.hostname,
      pageTitle: document.title,
      pageUrl: window.location.href,
    };

    const payload: CaptureRequestPayload = {
      rect: clampedRect,
      dpr: window.devicePixelRatio || 1,
      viewport,
      meta,
      isPartial,
    };

    // Hide highlight UI before capture and wait two animation frames
    this.overlay.setHidden(true);
    cancelAnimationFrame(this.frame);
    this.frame = 0;

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    try {
      // Send capture request to background service worker
      const response: CaptureResponsePayload = await chrome.runtime.sendMessage({
        type: 'CAPTURE_REQUEST',
        payload,
      });

      if (!this.active) return;
      this.overlay.setHidden(false);
      if (!response || !response.success) {
        feedback = `Capture failed: ${response?.error || 'Unknown error'}`;
        feedbackType = 'error';
      } else {
        // Generate descriptive toast feedback
        feedback = '';
        if (response.saved && response.copied) {
          feedback = `Copied and saved: ${response.filename}`;
        } else if (response.copied) {
          feedback = 'Copied to clipboard';
        } else if (response.saved) {
          feedback = `Saved to ${response.filename}`;
        } else {
          feedback = 'No output delivered. Check clipboard and download permissions.';
        }

        if (this.settings.copyToClipboard && !response.copied) feedback += ' | Clipboard failed';
        if (this.settings.saveToDisk && !response.saved) feedback += ' | Save failed';
        const incomplete = (this.settings.copyToClipboard && !response.copied) || (this.settings.saveToDisk && !response.saved);
        if (response.isPartial) {
          feedback += ' (Partial: extends outside viewport)';
          feedbackType = 'warn';
        } else {
          feedbackType = incomplete ? 'warn' : 'success';
        }
      }
    } catch (err) {
      console.error('ElementShot: Capture communication error:', err);
      this.overlay.setHidden(false);
      feedback = 'Capture failed due to extension error';
      feedbackType = 'error';
    } finally {
      this.capturing = false;
      this.overlay.setHidden(false);
      if (this.active) {
        if (!this.settings.stayInPickMode) this.stop();
        else if (this.currentElement) this.highlightElement(this.currentElement);
        if (feedback) this.overlay.showToast(feedback, feedbackType, 4000);
      }
    }
  }

  public getOverlay(): OverlayManager {
    return this.overlay;
  }
}
