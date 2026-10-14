import { CropRect } from '../common/types';

export class OverlayManager {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private boxEl: HTMLElement | null = null;
  private badgeEl: HTMLElement | null = null;
  private freezeBadgeEl: HTMLElement | null = null;
  private toastEl: HTMLElement | null = null;
  private toastTimeout: number | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (this.host) return;

    const existing = document.getElementById('elementshot-host');
    if (existing) {
      existing.remove();
    }

    this.host = document.createElement('div');
    this.host.id = 'elementshot-host';
    this.host.style.position = 'fixed';
    this.host.style.top = '0';
    this.host.style.left = '0';
    this.host.style.width = '0';
    this.host.style.height = '0';
    this.host.style.zIndex = '2147483647';
    this.host.style.pointerEvents = 'none';

    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        pointer-events: none;
      }
      .box {
        position: fixed;
        border: 2px solid #0284c7;
        background: rgba(14, 165, 233, 0.12);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 0 12px rgba(14, 165, 233, 0.15);
        pointer-events: none;
        z-index: 2147483647;
        box-sizing: border-box;
        transition: top 60ms ease-out, left 60ms ease-out, width 60ms ease-out, height 60ms ease-out;
        display: none;
      }
      .box.frozen {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.14);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 0 12px rgba(245, 158, 11, 0.2);
      }
      .badge {
        position: fixed;
        background: #0f172a;
        color: #f8fafc;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        line-height: 1.4;
        font-weight: 500;
        padding: 3px 8px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        pointer-events: none;
        z-index: 2147483647;
        white-space: nowrap;
        display: none;
        letter-spacing: 0.02em;
      }
      .badge .tag {
        color: #38bdf8;
        font-weight: 700;
      }
      .badge .dim {
        color: #94a3b8;
        margin-left: 6px;
      }
      .freeze-indicator {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: #f59e0b;
        color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 14px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        pointer-events: none;
        z-index: 2147483647;
        display: none;
        letter-spacing: 0.03em;
      }
      .toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0f172a;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        padding: 10px 16px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        pointer-events: auto;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 180ms ease-out, transform 180ms ease-out;
      }
      .toast.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .toast.success {
        border-color: rgba(34, 197, 94, 0.4);
      }
      .toast.warn {
        border-color: rgba(245, 158, 11, 0.5);
      }
      .toast.error {
        border-color: rgba(239, 68, 68, 0.5);
      }
      .toast-icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
    `;

    this.shadow.appendChild(style);

    this.boxEl = document.createElement('div');
    this.boxEl.className = 'box';
    this.shadow.appendChild(this.boxEl);

    this.badgeEl = document.createElement('div');
    this.badgeEl.className = 'badge';
    this.shadow.appendChild(this.badgeEl);

    this.freezeBadgeEl = document.createElement('div');
    this.freezeBadgeEl.className = 'freeze-indicator';
    this.freezeBadgeEl.textContent = 'HOVER FROZEN (Press F to resume tracking)';
    this.shadow.appendChild(this.freezeBadgeEl);

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast';
    this.toastEl.setAttribute('role', 'status');
    this.toastEl.setAttribute('aria-live', 'polite');
    this.shadow.appendChild(this.toastEl);

    document.documentElement.appendChild(this.host);
  }

  public showHighlight(rect: CropRect, label: string, isFrozen: boolean = false) {
    if (!this.boxEl || !this.badgeEl) return;

    this.boxEl.style.display = 'block';
    this.boxEl.style.left = `${Math.round(rect.x)}px`;
    this.boxEl.style.top = `${Math.round(rect.y)}px`;
    this.boxEl.style.width = `${Math.round(rect.width)}px`;
    this.boxEl.style.height = `${Math.round(rect.height)}px`;

    if (isFrozen) {
      this.boxEl.classList.add('frozen');
    } else {
      this.boxEl.classList.remove('frozen');
    }

    this.badgeEl.style.display = 'block';
    this.badgeEl.innerHTML = label;

    // Position badge above element if space allows, otherwise just below top border
    const badgeHeight = 24;
    const badgeTop = rect.y - badgeHeight - 4;
    if (badgeTop > 4) {
      this.badgeEl.style.top = `${Math.round(badgeTop)}px`;
      this.badgeEl.style.left = `${Math.round(Math.max(4, rect.x))}px`;
    } else {
      this.badgeEl.style.top = `${Math.round(rect.y + 4)}px`;
      this.badgeEl.style.left = `${Math.round(Math.max(4, rect.x + 4))}px`;
    }
  }

  public hideHighlight() {
    if (this.boxEl) this.boxEl.style.display = 'none';
    if (this.badgeEl) this.badgeEl.style.display = 'none';
  }

  public setFrozen(frozen: boolean) {
    if (!this.freezeBadgeEl) return;
    this.freezeBadgeEl.style.display = frozen ? 'block' : 'none';
    if (this.boxEl) {
      if (frozen) {
        this.boxEl.classList.add('frozen');
      } else {
        this.boxEl.classList.remove('frozen');
      }
    }
  }

  public showToast(message: string, type: 'success' | 'warn' | 'error' = 'success', duration = 3000) {
    if (!this.toastEl) return;

    if (this.toastTimeout) {
      window.clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }

    const iconSvg =
      type === 'success'
        ? `<svg class="toast-icon" viewBox="0 0 20 20" fill="#22c55e"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`
        : type === 'warn'
        ? `<svg class="toast-icon" viewBox="0 0 20 20" fill="#f59e0b"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`
        : `<svg class="toast-icon" viewBox="0 0 20 20" fill="#ef4444"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`;

    this.toastEl.className = `toast ${type} visible`;
    this.toastEl.innerHTML = `${iconSvg}<span>${message}</span>`;

    this.toastTimeout = window.setTimeout(() => {
      if (this.toastEl) {
        this.toastEl.classList.remove('visible');
      }
    }, duration);
  }

  public destroy() {
    if (this.toastTimeout) {
      window.clearTimeout(this.toastTimeout);
    }
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
    this.host = null;
    this.shadow = null;
    this.boxEl = null;
    this.badgeEl = null;
    this.freezeBadgeEl = null;
    this.toastEl = null;
  }
}
