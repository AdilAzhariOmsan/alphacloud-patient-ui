import { html, render, $, debounce } from '../utils/dom.js';
import { icon } from './icons.js';

/**
 * Top header: sidebar toggle (tablet only), page title, search, add-patient
 * action and the signed-in user.
 */
export function Header(root, { user, onSearch, onAdd, onToggleSidebar, onNotifications }) {
  render(root, html`
    <button type="button" class="icon-btn topbar__toggle" id="sidebar-toggle"
            aria-controls="sidebar" aria-expanded="true" aria-label="Collapse sidebar"
            data-tooltip="Toggle sidebar">
      ${icon('panelLeft')}
    </button>

    <div class="topbar__heading">
      <h1 class="topbar__title" lang="zh-Hans">患者管理</h1>
      <p class="topbar__subtitle">Patient Management · View and manage patient records</p>
    </div>

    <div class="topbar__actions">
      <form class="search" role="search" aria-label="Patients">
        <label for="patient-search" class="sr-only">Search patients by name, ID, phone or nationality</label>
        <span class="search__icon">${icon('search', { size: 'sm' })}</span>
        <input id="patient-search" class="search__input" type="search" placeholder="Search"
               autocomplete="off" spellcheck="false" />
        <kbd class="search__kbd" aria-hidden="true">/</kbd>
      </form>

      <button type="button" class="btn btn--primary btn--square" id="add-patient"
              aria-label="Add new patient" data-tooltip="Add new patient">
        ${icon('plus')}
      </button>

      <button type="button" class="icon-btn topbar__bell" aria-label="Notifications, 3 unread"
              data-tooltip="Notifications" data-action="notifications">
        ${icon('bell')}<span class="topbar__bell-dot" aria-hidden="true"></span>
      </button>

      <button type="button" class="profile" aria-label="Account menu for ${user.name}" data-action="profile">
        <span class="avatar avatar--sm" style="--av-bg:#0052CC;--av-fg:#fff" role="img" aria-label="${user.name}">${user.initials}</span>
        <span class="profile__text">
          <span class="profile__name">${user.name}</span>
          <span class="profile__role">${user.role}</span>
        </span>
        ${icon('chevronDown', { size: 'sm', className: 'profile__chevron' })}
      </button>
    </div>
  `);

  const input = $('#patient-search', root);
  const emit = debounce(() => onSearch(input.value.trim()), 300);
  input.addEventListener('input', emit);
  $('form', root).addEventListener('submit', (e) => { e.preventDefault(); onSearch(input.value.trim()); });

  // "/" focuses search from anywhere (unless typing in a field already).
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
    if (document.querySelector('dialog[open], .drawer.is-open')) return;
    e.preventDefault();
    input.focus();
  });

  $('#add-patient', root).addEventListener('click', (e) => onAdd(e.currentTarget));
  $('#sidebar-toggle', root).addEventListener('click', onToggleSidebar);
  $('[data-action="notifications"]', root).addEventListener('click', onNotifications);
  $('[data-action="profile"]', root).addEventListener('click', onNotifications);

  return {
    setSearch(value) { input.value = value; },
    setSidebarExpanded(expanded) {
      const btn = $('#sidebar-toggle', root);
      btn.setAttribute('aria-expanded', String(expanded));
      btn.setAttribute('aria-label', expanded ? 'Collapse sidebar' : 'Expand sidebar');
    },
  };
}
