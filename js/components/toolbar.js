import { html, render, $ } from '../utils/dom.js';
import { COUNTRIES, STATUSES } from '../data/patients.js';
import { icon } from './icons.js';

/* Mobile sort options. On wider screens the table's column headers sort instead. */
const SORT_OPTIONS = [
  ['createdAt:desc', 'Newest added'],
  ['createdAt:asc', 'Oldest added'],
  ['lastVisit:desc', 'Latest visit'],
  ['lastVisit:asc', 'Earliest visit'],
  ['name:asc', 'Name (A–Z)'],
  ['name:desc', 'Name (Z–A)'],
  ['nationality:asc', 'Nationality (A–Z)'],
  ['nationality:desc', 'Nationality (Z–A)'],
];

/**
 * List toolbar: section title, live indicator, filters, Export and, while rows
 * are selected, the bulk-actions bar.
 */
export function Toolbar(root, { onFilter, onClear, onExport, onBulkMenu, onClearSelection, onSort }) {
  const countries = Object.entries(COUNTRIES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  render(root, html`
    <div class="toolbar">
      <div class="toolbar__title">
        <h2 id="list-title">Patient list</h2>
        <span class="count-pill" id="total-count" aria-label="Total patients">–</span>
        <span class="live" title="Patient statuses update in real time">
          <span class="live__dot" aria-hidden="true"></span>Live
          <span class="sr-only">: patient statuses update automatically</span>
        </span>
      </div>

      <div class="toolbar__controls" role="group" aria-label="Filter patients">
        <span class="toolbar__filter-icon" aria-hidden="true">${icon('filter', { size: 'sm' })}</span>
        <label class="sr-only" for="f-nationality">Nationality</label>
        <select class="select" id="f-nationality" data-filter="nationality">
          <option value="">All nationalities</option>
          ${countries.map(([code, c]) => html`<option value="${code}">${c.name}</option>`)}
        </select>

        <label class="sr-only" for="f-status">Status</label>
        <select class="select" id="f-status" data-filter="status">
          <option value="">All statuses</option>
          ${Object.entries(STATUSES).map(([key, s]) => html`<option value="${key}">${s.label}</option>`)}
        </select>

        <label class="switch">
          <input type="checkbox" id="f-vip" data-filter="vip" />
          <span class="switch__track" aria-hidden="true"></span>
          VIP only
        </label>

        <div class="toolbar__sort">
          <label class="toolbar__sort-label" for="f-sort">Sort by</label>
          <select class="select" id="f-sort" data-sort-select>
            ${SORT_OPTIONS.map(([value, label]) => html`<option value="${value}">${label}</option>`)}
          </select>
        </div>

        <button type="button" class="btn btn--ghost btn--sm" id="clear-filters" hidden>Clear filters</button>

        <button type="button" class="btn btn--secondary toolbar__export" id="export-btn">
          ${icon('download', { size: 'sm' })}<span>Export</span>
        </button>
      </div>
    </div>

    <div class="bulkbar" id="bulkbar" hidden>
      <p class="bulkbar__count" aria-live="polite"><strong id="bulk-count">0</strong> selected</p>
      <button type="button" class="btn btn--secondary btn--sm" id="bulk-menu" aria-haspopup="menu" aria-expanded="false">
        ${icon('layers', { size: 'sm' })}Bulk actions${icon('chevronDown', { size: 'sm' })}
      </button>
      <button type="button" class="btn btn--ghost btn--sm" id="bulk-clear">Clear selection</button>
    </div>
  `);

  root.addEventListener('change', (e) => {
    if (e.target.hasAttribute('data-sort-select')) {
      const [sortKey, sortDir] = e.target.value.split(':');
      return onSort(sortKey, sortDir);
    }
    const key = e.target.dataset.filter;
    if (key) onFilter(key, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  });
  $('#clear-filters', root).addEventListener('click', onClear);
  $('#export-btn', root).addEventListener('click', (e) => onExport(e.currentTarget));
  $('#bulk-menu', root).addEventListener('click', (e) => onBulkMenu(e.currentTarget));
  $('#bulk-clear', root).addEventListener('click', onClearSelection);

  return {
    update({ query, hasFilters, total, unfilteredTotal, selectedCount, status }) {
      $('#f-nationality', root).value = query.nationality;
      $('#f-status', root).value = query.status;
      $('#f-vip', root).checked = query.vip;
      $('#f-sort', root).value = `${query.sortKey}:${query.sortDir}`;
      $('#clear-filters', root).hidden = !hasFilters;
      const pill = $('#total-count', root);
      if (status === 'ready') {
        pill.textContent = hasFilters ? `${total} / ${unfilteredTotal}` : String(unfilteredTotal);
        pill.setAttribute('aria-label', hasFilters ? `${total} of ${unfilteredTotal} patients match` : `${unfilteredTotal} patients in total`);
      }
      $('#export-btn', root).disabled = status !== 'ready' || total === 0;
      $('#bulkbar', root).hidden = selectedCount === 0;
      $('#bulk-count', root).textContent = selectedCount;
    },
    setExporting(on) {
      const btn = $('#export-btn', root);
      btn.disabled = on;
      btn.querySelector('span').textContent = on ? 'Exporting…' : 'Export';
    },
  };
}
