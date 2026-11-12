/**
 * One shared tooltip for the whole app. It appears on hover or keyboard focus for:
 *   [data-tooltip]                     always (icon buttons)
 *   [data-tooltip][data-tooltip-when="rail"]  only when the sidebar is icon-only
 *   [data-truncate]                    only when the text is actually cut off
 * The target gets aria-describedby while the tooltip is visible, and Esc hides it (WCAG 1.4.13).
 */
export function initTooltips() {
  const tip = document.getElementById('tooltip');
  const sidebar = document.getElementById('sidebar');
  let target = null;
  let showTimer;

  const isRail = () => sidebar.offsetWidth < 120;

  function textFor(el) {
    if (el.hasAttribute('data-truncate')) {
      return el.scrollWidth > el.clientWidth + 1 ? el.textContent.trim() : null;
    }
    if (el.dataset.tooltipWhen === 'rail' && !isRail()) return null;
    return el.dataset.tooltip || null;
  }

  function position(el) {
    const r = el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const placement = el.dataset.tooltipPlacement;
    let top;
    let left;
    if (placement === 'right') {
      top = r.top + r.height / 2 - t.height / 2;
      left = r.right + 10;
    } else {
      top = r.top - t.height - 8;
      left = r.left + r.width / 2 - t.width / 2;
      if (top < 8) top = r.bottom + 8;
    }
    left = Math.min(Math.max(8, left), window.innerWidth - t.width - 8);
    tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  function show(el) {
    const text = textFor(el);
    if (!text) return;
    target = el;
    tip.textContent = text;
    tip.hidden = false;
    tip.dataset.placement = el.dataset.tooltipPlacement || 'top';
    position(el);
    tip.classList.add('is-visible');
    // A truncated label already has its full text as its accessible name, so
    // only icon buttons get the tooltip attached as a description.
    if (!el.hasAttribute('data-truncate')) el.setAttribute('aria-describedby', 'tooltip');
  }

  function hide() {
    clearTimeout(showTimer);
    if (!target) return;
    if (target.getAttribute('aria-describedby') === 'tooltip') target.removeAttribute('aria-describedby');
    target = null;
    tip.classList.remove('is-visible');
    tip.hidden = true;
  }

  const findTarget = (node) => node instanceof Element ? node.closest('[data-tooltip], [data-truncate]') : null;

  document.addEventListener('pointerover', (e) => {
    const el = findTarget(e.target);
    if (el === target) return;
    hide();
    if (el) showTimer = setTimeout(() => show(el), 350);
  });
  document.addEventListener('pointerout', (e) => {
    const el = findTarget(e.target);
    if (el && !el.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('focusin', (e) => {
    hide();
    const el = findTarget(e.target);
    if (el && e.target.matches(':focus-visible')) show(el);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); }, true);
  document.addEventListener('scroll', hide, true);
  document.addEventListener('pointerdown', hide);
}
