import { describe, it, expect } from 'vitest';

describe('element picker label and traversal logic', () => {
  it('formats element badge label with tag, id, and first class', () => {
    function formatLabel(tag: string, id: string, classList: string[], width: number, height: number): string {
      const cleanTag = (tag || 'element').toLowerCase();
      const idStr = id ? `#${id}` : '';
      const firstClass = classList && classList.length > 0 ? `.${classList[0]}` : '';
      const dim = `${Math.round(width)} x ${Math.round(height)}`;
      return `<span class="tag">&lt;${cleanTag}${idStr}${firstClass}&gt;</span><span class="dim">${dim}</span>`;
    }

    const label = formatLabel('DIV', 'hero', ['container', 'active'], 320.4, 180.8);
    expect(label).toBe(
      '<span class="tag">&lt;div#hero.container&gt;</span><span class="dim">320 x 181</span>'
    );
  });

  it('formats badge label correctly when id and classes are absent', () => {
    function formatLabel(tag: string, id: string, classList: string[], width: number, height: number): string {
      const cleanTag = (tag || 'element').toLowerCase();
      const idStr = id ? `#${id}` : '';
      const firstClass = classList && classList.length > 0 ? `.${classList[0]}` : '';
      const dim = `${Math.round(width)} x ${Math.round(height)}`;
      return `<span class="tag">&lt;${cleanTag}${idStr}${firstClass}&gt;</span><span class="dim">${dim}</span>`;
    }

    const label = formatLabel('BUTTON', '', [], 100, 40);
    expect(label).toBe(
      '<span class="tag">&lt;button&gt;</span><span class="dim">100 x 40</span>'
    );
  });
});
