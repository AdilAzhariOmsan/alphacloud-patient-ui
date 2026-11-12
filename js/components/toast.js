import { html, toElement } from '../utils/dom.js';
import { icon } from './icons.js';

const ICONS = { success: 'checkCircle', error: 'alertCircle', info: 'alertCircle' };
let container;

/**
 * Non-blocking notifications. Success and info toasts are announced politely
 * through the container's aria-live region. Errors use role="alert".
 * An optional action, such as Undo, keeps the toast open longer.
 */
export function toast(message, { type = 'info', action, duration } = {}) {
  container ??= document.getElementById('toasts');
  const el = toElement(html`
    <div class="toast toast--${type}" ${type === 'error' ? html`role="alert"` : html`role="status"`}>
      <span class="toast__icon">${icon(ICONS[type])}</span>
      <p class="toast__msg">${message}</p>
      ${action ? html`<button type="button" class="toast__action">${action.label}</button>` : ''}
      <button type="button" class="toast__close" aria-label="Dismiss notification">${icon('x', { size: 'sm' })}</button>
    </div>`);

  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  };
  const arm = () => { timer = setTimeout(dismiss, duration ?? (action ? 7000 : type === 'error' ? 6000 : 3800)); };

  el.querySelector('.toast__close').addEventListener('click', dismiss);
  el.querySelector('.toast__action')?.addEventListener('click', () => { dismiss(); action.onClick(); });
  // Pause the timer while the user hovers over or focuses the toast (WCAG 2.2.1).
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', arm);
  el.addEventListener('focusin', () => clearTimeout(timer));
  el.addEventListener('focusout', arm);

  container.appendChild(el);
  arm();
  return dismiss;
}
