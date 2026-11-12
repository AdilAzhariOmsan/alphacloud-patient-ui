import { html, render, $, $$ } from '../utils/dom.js';
import { formatDateTime, toIso, initials, avatarColours } from '../utils/format.js';
import { COUNTRIES, STATUSES } from '../data/patients.js';
import { icon } from './icons.js';

const COLUMNS = [
  { key: 'name', label: 'Patient Name', sortable: true },
  { key: 'contact', label: 'Contact' },
  { key: 'nationality', label: 'Nationality', sortable: true },
  { key: 'createdAt', label: 'Datetime', sortable: true },
];

export const flagImg = (cc, size = 20) => {
  const c = COUNTRIES[cc];
  return html`<img class="flag" src="https://flagcdn.com/w40/${c.flag}.png"
    srcset="https://flagcdn.com/w80/${c.flag}.png 2x" width="${size}" height="${Math.round(size * 0.75)}"
    alt="Flag of ${c.name}" loading="lazy" decoding="async" />`;
};

export const avatar = (p, size = '') => {
  const [bg, fg] = avatarColours(p.name);
  const status = STATUSES[p.status];
  return html`
    <span class="avatar${size ? ` avatar--${size}` : ''}" style="--av-bg:${bg};--av-fg:${fg}" aria-hidden="true">
      ${initials(p.name)}
      <span class="dot dot--${p.status}" data-status-dot="${p.id}"></span>
    </span>
    <span class="sr-only" data-status-sr="${p.id}">Status: ${status.label}.</span>`;
};

const vipBadge = () => html`<span class="badge-vip" title="VIP patient">${icon('star')}VIP</span>`;

function rowTemplate(p, selected) {
  const c = COUNTRIES[p.nationality];
  const isSelected = selected.has(p.id);
  return html`
    <tr class="prow${isSelected ? ' is-selected' : ''}" data-id="${p.id}">
      <td class="col-check">
        <input type="checkbox" class="checkbox" data-select="${p.id}" ${isSelected ? html`checked` : ''}
               aria-label="Select ${p.name}" />
      </td>
      <td class="col-name" data-label="Patient">
        <div class="pcell">
          ${avatar(p)}
          <div class="pcell__text">
            <div class="pcell__name-row">
              <button type="button" class="pcell__name truncate" data-open="${p.id}" data-truncate
                      aria-label="${p.name}${p.vip ? ', VIP' : ''}. View details">${p.name}</button>
              ${p.vip ? vipBadge() : ''}
            </div>
            <span class="pcell__id">${p.idNumber}</span>
          </div>
        </div>
      </td>
      <td class="col-contact" data-label="Contact"><span class="nowrap">${p.phone}</span></td>
      <td class="col-nat" data-label="Nationality">
        <span class="nat">${flagImg(p.nationality)}<span class="truncate" data-truncate>${c.name}</span></span>
      </td>
      <td class="col-date" data-label="Datetime"><time datetime="${toIso(p.createdAt)}" class="nowrap">${formatDateTime(p.createdAt)}</time></td>
      <td class="col-action">
        <button type="button" class="icon-btn" data-menu="${p.id}" aria-haspopup="menu" aria-expanded="false"
                aria-label="More actions for ${p.name}" data-tooltip="Actions">
          ${icon('dots')}
        </button>
      </td>
    </tr>`;
}

const skeletonRows = (n) => Array.from({ length: n }, (_, i) => html`
  <tr class="prow prow--skeleton" aria-hidden="true">
    <td class="col-check"><span class="skel skel--box"></span></td>
    <td class="col-name"><div class="pcell"><span class="skel skel--circle"></span>
      <div class="pcell__text"><span class="skel" style="width:${120 + (i % 3) * 28}px"></span><span class="skel skel--sm" style="width:96px"></span></div></div></td>
    <td><span class="skel" style="width:128px"></span></td>
    <td><span class="skel" style="width:${84 + (i % 2) * 24}px"></span></td>
    <td><span class="skel" style="width:150px"></span></td>
    <td class="col-action"><span class="skel skel--box"></span></td>
  </tr>`);

const stateRow = ({ tone = '', iconName, title, text, action }) => html`
  <tr class="prow prow--state">
    <td colspan="6">
      <div class="state${tone ? ` state--${tone}` : ''}" ${tone === 'error' ? html`role="alert"` : ''}>
        <span class="state__icon">${icon(iconName)}</span>
        <p class="state__title">${title}</p>
        <p class="state__text">${text}</p>
        ${action ? html`<button type="button" class="btn ${action.primary ? 'btn--primary' : 'btn--secondary'} btn--sm" data-state-action="${action.id}">
          ${action.icon ? icon(action.icon, { size: 'sm' }) : ''}${action.label}</button>` : ''}
      </div>
    </td>
  </tr>`;

/**
 * Patient table. A stateless renderer plus delegated event handlers that
 * call back into the app.
 */
export function PatientTable(root, handlers) {
  render(root, html`
    <div class="table-wrap" id="table-wrap" role="region" aria-labelledby="list-title" tabindex="0">
      <table class="ptable" id="patient-table" aria-describedby="results-summary">
        <thead>
          <tr>
            <th class="col-check" scope="col">
              <input type="checkbox" class="checkbox" id="select-all" aria-label="Select all patients on this page" />
            </th>
            ${COLUMNS.map((col) => html`
              <th scope="col" class="col-${col.key}" data-col="${col.key}">
                ${col.sortable
                  ? html`<button type="button" class="sort-btn" data-sort="${col.key}">${col.label}<span class="sort-btn__icon"></span></button>`
                  : col.label}
              </th>`)}
            <th scope="col" class="col-action">Action</th>
          </tr>
        </thead>
        <tbody id="patient-tbody"></tbody>
      </table>
      <p class="sr-only" aria-live="polite" id="table-live"></p>
    </div>
  `);

  const table = $('#patient-table', root);
  const tbody = $('#patient-tbody', root);
  const selectAll = $('#select-all', root);
  const live = $('#table-live', root);

  // ---- Delegated events ----
  root.addEventListener('click', (e) => {
    const sortBtn = e.target.closest('[data-sort]');
    if (sortBtn) return handlers.onSort(sortBtn.dataset.sort);

    const menuBtn = e.target.closest('[data-menu]');
    if (menuBtn) return handlers.onMenu(menuBtn.dataset.menu, menuBtn);

    const stateBtn = e.target.closest('[data-state-action]');
    if (stateBtn) return handlers.onStateAction(stateBtn.dataset.stateAction);

    if (e.target.closest('input, a, button:not([data-open])')) return;

    // Clicking the name or anywhere on the row opens the detail panel.
    const row = e.target.closest('tr[data-id]');
    if (row) handlers.onOpen(row.dataset.id, $('[data-open]', row));
  });

  root.addEventListener('change', (e) => {
    if (e.target === selectAll) return handlers.onSelectAll(selectAll.checked);
    const id = e.target.dataset.select;
    if (id) handlers.onSelect(id, e.target.checked);
  });

  // Arrow keys move between rows, keeping the same kind of control focused.
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const cell = e.target.closest('tr[data-id] [data-open], tr[data-id] [data-select], tr[data-id] [data-menu]');
    if (!cell) return;
    const attr = ['data-open', 'data-select', 'data-menu'].find((a) => cell.hasAttribute(a));
    const rows = $$('tr[data-id]', tbody);
    const idx = rows.indexOf(cell.closest('tr'));
    const next = rows[idx + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) {
      e.preventDefault();
      $(`[${attr}]`, next).focus();
    }
  });

  function updateSortHeaders(sortKey, sortDir) {
    $$('th[data-col]', table).forEach((th) => {
      const btn = $('[data-sort]', th);
      if (!btn) return;
      const active = th.dataset.col === sortKey;
      if (active) th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
      btn.classList.toggle('is-active', active);
      $('.sort-btn__icon', btn).innerHTML = String(icon(active ? (sortDir === 'asc' ? 'sortAsc' : 'sortDesc') : 'sort', { size: 'sm' }));
      const label = th.textContent.trim();
      btn.setAttribute('aria-label', active
        ? `${label}, sorted ${sortDir === 'asc' ? 'ascending' : 'descending'}. Click to sort ${sortDir === 'asc' ? 'descending' : 'ascending'}`
        : `${label}, click to sort`);
    });
  }

  return {
    /** state: { status, items, error, query, selected, hasFilters, pageSize } */
    update(state) {
      const { status, items, error, query, selected, hasFilters } = state;
      updateSortHeaders(query.sortKey, query.sortDir);
      table.setAttribute('aria-busy', String(status === 'loading'));

      if (status === 'loading' && items.length === 0) {
        render(tbody, skeletonRows(Math.min(query.pageSize, 8)));
        live.textContent = 'Loading patients…';
      } else if (status === 'loading') {
        tbody.classList.add('is-refreshing');
        live.textContent = 'Updating results…';
      } else if (status === 'error') {
        tbody.classList.remove('is-refreshing');
        render(tbody, stateRow({
          tone: 'error', iconName: 'wifiOff', title: "Couldn't load patients",
          text: error?.message ?? 'Something went wrong while fetching data.',
          action: { id: 'retry', label: 'Try again', icon: 'refresh', primary: true },
        }));
        live.textContent = '';
      } else if (items.length === 0) {
        tbody.classList.remove('is-refreshing');
        render(tbody, hasFilters
          ? stateRow({ iconName: 'searchX', title: 'No patients found', text: 'No patients match your search or filters. Try a different keyword or clear the filters.', action: { id: 'clear', label: 'Clear filters' } })
          : stateRow({ iconName: 'inbox', title: 'No patients yet', text: 'Patients you register will appear here.', action: { id: 'add', label: 'Add patient', icon: 'plus', primary: true } }));
        live.textContent = 'No results.';
      } else {
        tbody.classList.remove('is-refreshing');
        // Rows are re-rendered, so keep keyboard focus on the same control of the same patient.
        const focused = tbody.contains(document.activeElement) ? document.activeElement : null;
        const focusAttr = focused && ['data-open', 'data-select', 'data-menu'].find((a) => focused.hasAttribute(a));
        const focusId = focusAttr && focused.getAttribute(focusAttr);
        render(tbody, items.map((p) => rowTemplate(p, selected)));
        live.textContent = '';
        if (focusAttr) {
          const again = $(`[${focusAttr}="${focusId}"]`, tbody);
          if (again) again.focus();
          else $('#table-wrap', root).focus();
        }
      }

      // Header "select all" checkbox: checked, unchecked or indeterminate.
      const ids = status === 'ready' ? items.map((p) => p.id) : [];
      const selectedOnPage = ids.filter((id) => selected.has(id)).length;
      selectAll.disabled = ids.length === 0;
      selectAll.checked = ids.length > 0 && selectedOnPage === ids.length;
      selectAll.indeterminate = selectedOnPage > 0 && selectedOnPage < ids.length;
    },

    /** Patch one row's status without re-rendering (real-time updates). */
    setStatus(id, status, label) {
      const dot = $(`[data-status-dot="${id}"]`, tbody);
      if (!dot) return;
      dot.className = `dot dot--${status} is-pulsing`;
      $(`[data-status-sr="${id}"]`, tbody).textContent = `Status: ${label}.`;
      setTimeout(() => dot.classList.remove('is-pulsing'), 1600);
    },

    focusRow(id) {
      $(`tr[data-id="${id}"] [data-open]`, tbody)?.focus();
    },
  };
}
