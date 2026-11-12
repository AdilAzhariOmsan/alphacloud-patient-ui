import { html, render } from '../utils/dom.js';
import { icon } from './icons.js';

/** Page numbers with ellipses: 1 … 4 5 6 … 12 */
function pageList(page, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function Pagination(root, { onPage, onPageSize }) {
  let busy = false;
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (btn && !btn.disabled && !busy && !btn.classList.contains('is-current')) onPage(Number(btn.dataset.page));
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-page-size]')) onPageSize(Number(e.target.value));
  });

  return {
    update({ status, page, pageCount, shown, total, pageSize }) {
      busy = status === 'loading';
      // Re-rendering replaces the buttons, so remember which control had focus and restore it.
      const active = root.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
      const hidden = status === 'error' || (status === 'ready' && total === 0);

      render(root, html`
        <div class="pagination"${hidden ? html` hidden` : ''}>
          <p class="pagination__summary" id="results-summary" aria-live="polite">
            ${status === 'loading' && total === 0
              ? 'Loading results…'
              : html`Showing <strong>${shown}</strong> of <strong>${total}</strong> results`}
          </p>

          <div class="pagination__size">
            <label for="page-size">Rows per page</label>
            <select id="page-size" class="select select--sm" data-page-size data-focus-key="size">
              ${[8, 16, 32].map((n) => html`<option value="${n}" ${n === pageSize ? html`selected` : ''}>${n}</option>`)}
            </select>
          </div>

          <nav class="pagination__nav" aria-label="Pagination">
            <button type="button" class="btn btn--secondary btn--sm" data-page="${page - 1}" data-focus-key="prev"
                    ${page <= 1 ? html`disabled` : ''} aria-label="Previous page">
              ${icon('chevronLeft', { size: 'sm' })}<span class="pagination__word">Prev</span>
            </button>
            <ol class="pagination__pages">
              ${pageList(page, pageCount).map((p) => p === '…'
                ? html`<li class="pagination__gap" aria-hidden="true">…</li>`
                : html`<li><button type="button" class="page-btn${p === page ? ' is-current' : ''}" data-page="${p}"
                      data-focus-key="${p === page ? 'current' : `p${p}`}" ${p === page ? html`aria-current="page"` : ''}
                      aria-label="Page ${p}${p === page ? ', current page' : ''}">${p}</button></li>`)}
            </ol>
            <span class="pagination__mobile-current" aria-hidden="true">${page} / ${pageCount}</span>
            <button type="button" class="btn btn--secondary btn--sm" data-page="${page + 1}" data-focus-key="next"
                    ${page >= pageCount ? html`disabled` : ''} aria-label="Next page">
              <span class="pagination__word">Next</span>${icon('chevronRight', { size: 'sm' })}
            </button>
          </nav>
        </div>
      `);
      root.querySelector('.pagination').setAttribute('aria-busy', String(busy));

      if (active) {
        const target = root.querySelector(`[data-focus-key="${active}"]:not(:disabled)`)
          ?? root.querySelector('[data-focus-key="current"]');
        target?.focus();
      }
    },
  };
}
