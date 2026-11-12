/**
 * Tiny templating helpers.
 *
 * `html` is a tagged template that HTML-escapes every interpolated value
 * unless it was produced by `html` itself or wrapped with `raw()`. This keeps
 * components declarative without opening XSS holes for user-entered data
 * (e.g. a patient name typed into the "Add patient" form).
 */
class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

export const raw = (value) => new SafeHtml(value);

function stringify(value) {
  if (value == null || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(stringify).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = '';
  strings.forEach((chunk, i) => {
    out += chunk;
    if (i < values.length) out += stringify(values[i]);
  });
  return new SafeHtml(out);
}

/** Replace an element's content with a template result. */
export function render(el, template) {
  el.innerHTML = stringify(template);
}

/** Parse a template into a single element. */
export function toElement(template) {
  const tpl = document.createElement('template');
  tpl.innerHTML = stringify(template).trim();
  return tpl.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export const focusableWithin = (root) =>
  $$(FOCUSABLE, root).filter((el) => !el.hasAttribute('hidden') && el.offsetParent !== null);

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
