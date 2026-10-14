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
  private dragStart: { x: number; y: number } | null = null;
  private dragRect: CropRect | null = null;
  private suppressClickUntil = 0;
  private wheelTime = 0;
  private selectionAnchor: Element | null = null;
  private onPointerDown = (e: PointerEvent) => {
    if (!this.active || this.capturing || !e.shiftKey || e.button !== 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    cancelAnimationFrame(this.frame); this.frame = 0;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragRect = null;
    this.overlay.setFrozen(false);
    this.overlay.hideToast();
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.active) return;
    if (!this.dragStart) { if (this.isFrozen || this.capturing) e.stopImmediatePropagation(); return; }
    e.preventDefault(); e.stopImmediatePropagation();
    const a = this.dragStart;
    this.dragRect = { x: Math.min(a.x, e.clientX), y: Math.min(a.y, e.clientY), width: Math.abs(e.clientX - a.x), height: Math.abs(e.clientY - a.y) };
    this.overlay.showHighlight(this.dragRect, `Area ${Math.round(this.dragRect.width)} x ${Math.round(this.dragRect.height)} | Release to capture | Esc cancel`);
  };
  private onPointerUp = (e: PointerEvent) => {
    if (!this.active || !this.dragStart) return;
    this.onPointerMove(e);
    e.preventDefault(); e.stopImmediatePropagation();
    const rect = this.dragRect;
    this.dragStart = null; this.dragRect = null;
    this.suppressClickUntil = Date.now() + 500;
    if (rect && rect.width >= 3 && rect.height >= 3) void this.captureRect(rect, 'region');
    else {
      if (this.currentElement) this.highlightElement(this.currentElement);
      this.overlay.showToast('Hold Shift and drag a larger area to capture.', 'warn');
    }
  };
  private onPointerCancel = () => { this.dragStart = null; this.dragRect = null; if (this.active && this.currentElement) this.highlightElement(this.currentElement); };
  private onWheel = (e: WheelEvent) => {
    if (!this.active || e.ctrlKey || e.altKey) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (this.capturing || this.dragStart || !e.deltaY) return;
    if (Date.now() - this.wheelTime < 120) return;
    this.wheelTime = Date.now();
    cancelAnimationFrame(this.frame); this.frame = 0;
    this.selectionAnchor = deepElementFromPoint(e.clientX, e.clientY) || this.currentElement;
    this.selectRelative(e.deltaY < 0);
  };
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

    for (const name of ['pointerover', 'pointerout', 'mouseover', 'mouseout']) window.addEventListener(name, this.blockHover, true);
    window.addEventListener('pointerdown', this.onPointerDown, true);
    window.addEventListener('pointermove', this.onPointerMove, true);
    window.addEventListener('pointerup', this.onPointerUp, true);
    window.addEventListener('pointercancel', this.onPointerCancel, true);
    window.addEventListener('wheel', this.onWheel, { capture: true, passive: false });
    window.addEventListener('mousemove', this.onMouseMove, true);
    window.addEventListener('click', this.onClick, true);
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('scroll', this.onScrollOrResize, true);
    window.addEventListener('resize', this.onScrollOrResize, true);
    document.addEventListener('visibilitychange', this.onVisibilityOrUnload, true);
    window.addEventListener('beforeunload', this.onVisibilityOrUnload, true);
    window.addEventListener('pagehide', this.onVisibilityOrUnload, true);

    this.overlay.showToast('Click an element | Scroll up: larger, down: smaller | Shift-drag: area | Esc cancel', 'success', 2500);
  }

  public stop() {
    if (!this.active) return;
    this.active = false;
    this.isFrozen = false;
    this.currentElement = null;
    this.childHistory = [];
    this.dragStart = null; this.dragRect = null; this.selectionAnchor = null;

    document.documentElement.style.setProperty('cursor', this.previousCursor, this.previousCursorPriority);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.overlay.hideToast();

    for (const name of ['pointerover', 'pointerout', 'mouseover', 'mouseout']) window.removeEventListener(name, this.blockHover, true);
    window.removeEventListener('pointerdown', this.onPointerDown, true);
    window.removeEventListener('pointermove', this.onPointerMove, true);
    window.removeEventListener('pointerup', this.onPointerUp, true);
    window.removeEventListener('pointercancel', this.onPointerCancel, true);
    window.removeEventListener('wheel', this.onWheel, true);
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
    if (!this.active || this.capturing || this.dragStart) return;
    if (this.isFrozen) { e.stopImmediatePropagation(); return; }
    this.pointer = { x: e.clientX, y: e.clientY };
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (!this.active || this.capturing || this.isFrozen) return;
      const el = deepElementFromPoint(this.pointer.x, this.pointer.y);
      if (!el || el === this.currentElement || el === this.selectionAnchor) return;
      this.selectionAnchor = null;
      this.currentElement = el;
      this.childHistory = [];
      this.highlightElement(el);
    });
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.active) return;

    if (e.key === 'Enter' && this.currentElement && !this.dragStart) {
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

    if (!this.dragStart && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      e.stopPropagation();
      this.isFrozen = !this.isFrozen;
      this.overlay.setFrozen(this.isFrozen);
      return;
    }

    if (this.dragStart || this.capturing) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault(); e.stopImmediatePropagation();
      this.selectRelative(e.key === 'ArrowUp');
    }
  }

  private selectRelative(parent: boolean) {
    if (!this.currentElement) return;
    let target: Element | null;
    if (parent) {
      target = this.currentElement.parentElement || (this.currentElement.getRootNode() instanceof ShadowRoot ? (this.currentElement.getRootNode() as ShadowRoot).host : null);
      if (!target || target === document.documentElement) return;
      this.childHistory.push(this.currentElement);
    } else target = this.childHistory.pop() || this.currentElement.shadowRoot?.firstElementChild || this.currentElement.firstElementChild;
    if (target && target.isConnected) { this.currentElement = target; this.highlightElement(target); }
  }

  private onScrollOrResize() {
    if (!this.active || this.capturing || this.dragStart || !this.currentElement) return;
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
    const label = `<${tag}${id}${firstClass}>  ${dimensions} | Click / Enter | Scroll: size | Shift-drag: area | F lock | Esc`;

    this.overlay.showHighlight(rect, label, this.isFrozen);
  }

  private async onClick(e: MouseEvent) {
    if (!this.active) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (this.capturing || this.dragStart || Date.now() < this.suppressClickUntil) return;
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

    if (!targetEl.isConnected) return;
    await this.captureRect(cssRect, targetEl.tagName, targetEl);
  }

  private async captureRect(cssRect: CropRect, tagName: string, targetEl?: Element) {
    if (!this.active || this.capturing) return;
    // Apply padding if configured
    const expandedRect = expandRectWithPadding(cssRect, this.settings.padding);

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const { clampedRect, isPartial } = clampRectToViewport(expandedRect, viewport);

    if (!clampedRect.width || !clampedRect.height) {
      this.overlay.showToast('The selected element has no visible pixels. Choose another element.', 'warn');
      return;
    }
    this.capturing = true;
    let feedback = '';
    let feedbackType: 'success' | 'warn' | 'error' = 'success';
    const meta: ElementMeta = {
      tagName,
      id: targetEl?.id,
      className: typeof targetEl?.className === 'string' ? targetEl.className : '',
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
      if (!this.active) return;
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
