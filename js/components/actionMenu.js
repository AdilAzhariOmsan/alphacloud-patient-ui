import { html, toElement } from '../utils/dom.js';
import { icon } from './icons.js';

/**
 * Accessible popup menu (WAI-ARIA menu button pattern). One menu can be open
 * at a time. Keys: ↑/↓, Home/End, Esc (closes and returns focus) and Tab
 * (closes). Used for row quick actions and the bulk actions menu.
 *
 * items: [{ id, label, icon, danger?, disabled? } | 'separator']
 */
let activeMenu = null;

export function closeMenu({ restoreFocus = false } = {}) {
  if (!activeMenu) return;
  const { el, trigger, cleanup } = activeMenu;
  activeMenu = null;
  cleanup();
  el.remove();
  trigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus && trigger.isConnected) trigger.focus();
}

export function openMenu(trigger, items, onSelect, { label = 'Actions' } = {}) {
  if (activeMenu?.trigger === trigger) return closeMenu({ restoreFocus: true });
  closeMenu();

  const menuId = `menu-${Math.random().toString(36).slice(2, 8)}`;
  const el = toElement(html`
    <ul class="menu" role="menu" id="${menuId}" aria-label="${label}">
      ${items.map((item) => item === 'separator'
        ? html`<li role="separator" class="menu__sep"></li>`
        : html`<li role="none">
            <button type="button" role="menuitem" tabindex="-1" class="menu__item${item.danger ? ' menu__item--danger' : ''}"
                    data-item="${item.id}" ${item.disabled ? html`aria-disabled="true"` : ''}>
              ${icon(item.icon, { size: 'sm' })}<span>${item.label}</span>
            </button>
          </li>`)}
    </ul>`);
  document.body.appendChild(el);

  // Position below the trigger, right-aligned. Flip above it when there is no room below.
  const r = trigger.getBoundingClientRect();
  const { offsetWidth: w, offsetHeight: h } = el;
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  let left = r.right - w;
  left = Math.min(Math.max(8, left), window.innerWidth - w - 8);
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;

  trigger.setAttribute('aria-expanded', 'true');
  trigger.setAttribute('aria-controls', menuId);

  const buttons = Array.from(el.querySelectorAll('[role="menuitem"]'));
  const enabled = buttons.filter((b) => b.getAttribute('aria-disabled') !== 'true');
  const focusAt = (i) => enabled[(i + enabled.length) % enabled.length]?.focus();
  focusAt(0);

  const onKey = (e) => {
    const idx = enabled.indexOf(document.activeElement);
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusAt(idx + 1); break;
      case 'ArrowUp': e.preventDefault(); focusAt(idx - 1); break;
      case 'Home': e.preventDefault(); focusAt(0); break;
      case 'End': e.preventDefault(); focusAt(enabled.length - 1); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); closeMenu({ restoreFocus: true }); break;
      case 'Tab': closeMenu({ restoreFocus: true }); break;
      default: break;
    }
  };

  const onClick = (e) => {
    const btn = e.target.closest('[data-item]');
    if (!btn || btn.getAttribute('aria-disabled') === 'true') return;
    closeMenu({ restoreFocus: true });
    onSelect(btn.dataset.item);
  };

  const onOutside = (e) => {
    if (!el.contains(e.target) && !trigger.contains(e.target)) closeMenu();
  };
  const onScroll = (e) => { if (!el.contains(e.target)) closeMenu(); };

  el.addEventListener('keydown', onKey);
  el.addEventListener('click', onClick);
  // Defer so the click that opened the menu doesn't immediately close it.
  setTimeout(() => document.addEventListener('pointerdown', onOutside), 0);
  window.addEventListener('resize', closeMenu);
  document.addEventListener('scroll', onScroll, true);

  activeMenu = {
    el,
    trigger,
    cleanup() {
      document.removeEventListener('pointerdown', onOutside);
      window.removeEventListener('resize', closeMenu);
      document.removeEventListener('scroll', onScroll, true);
    },
  };
}
