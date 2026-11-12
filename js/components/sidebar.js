import { html, render, $ } from '../utils/dom.js';
import { icon } from './icons.js';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'patient', label: 'Patient', icon: 'patient' },
  { id: 'queue', label: 'Queue', icon: 'queue', badge: 'queue', badgeNoun: ['patient waiting', 'patients waiting'] },
  { id: 'consultation', label: 'Consultation', icon: 'consultation' },
  { id: 'warehouse', label: 'Warehouse', icon: 'warehouse' },
  { id: 'reports', label: 'Reports', icon: 'reports' },
  { id: 'appointment', label: 'Appointment', icon: 'appointment', badge: 'appointment', badgeNoun: ['appointment today', 'appointments today'] },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const badgeLabel = (item, n) => `, ${n} ${n === 1 ? item.badgeNoun[0] : item.badgeNoun[1]}`;

/**
 * Left navigation. Only the Patient module is part of this assessment, so the
 * other links announce themselves as "coming soon" instead of navigating.
 */
export function Sidebar(root, { active = 'patient', counts = {}, onNavigate } = {}) {
  render(root, html`
    <div class="sidebar__brand">
      <span class="sidebar__logo">${icon('logo')}</span>
      <span class="sidebar__brand-name">Alphacloud</span>
    </div>

    <nav class="sidebar__nav" aria-label="Main navigation">
      <ul class="nav">
        ${NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          const count = item.badge ? counts[item.badge] ?? 0 : null;
          return html`
            <li>
              <a href="#${item.id}"
                 class="nav__link${isActive ? ' is-active' : ''}"
                 data-nav="${item.id}"
                 data-tooltip="${item.label}"
                 data-tooltip-when="rail"
                 data-tooltip-placement="right"
                 ${isActive ? html`aria-current="page"` : ''}>
                ${icon(item.icon)}
                <span class="nav__label">${item.label}</span>
                ${item.badge ? html`
                  <span class="nav__badge" data-badge="${item.badge}" aria-hidden="true">${count}</span>
                  <span class="sr-only" data-badge-sr="${item.badge}">${badgeLabel(item, count)}</span>
                ` : ''}
              </a>
            </li>`;
        })}
      </ul>
    </nav>

    <div class="pro-card">
      <span class="pro-card__icon">${icon('sparkles')}</span>
      <p class="pro-card__title">Update to Pro</p>
      <p class="pro-card__text">Unlock advanced reports, multi-branch queues and unlimited records.</p>
      <button type="button" class="btn btn--primary btn--sm pro-card__cta" data-action="upgrade">Upgrade now</button>
    </div>
  `);

  root.addEventListener('click', (e) => {
    const link = e.target.closest('[data-nav]');
    if (link) {
      e.preventDefault();
      if (link.dataset.nav !== active) onNavigate?.(NAV_ITEMS.find((i) => i.id === link.dataset.nav));
      return;
    }
    if (e.target.closest('[data-action="upgrade"]')) onNavigate?.({ id: 'upgrade', label: 'Pro plan' });
  });

  return {
    setCount(key, n) {
      const item = NAV_ITEMS.find((i) => i.badge === key);
      const badge = $(`[data-badge="${key}"]`, root);
      const sr = $(`[data-badge-sr="${key}"]`, root);
      if (!item || !badge) return;
      if (badge.textContent !== String(n)) {
        badge.textContent = n;
        badge.classList.remove('is-bumped');
        void badge.offsetWidth; // restart the animation
        badge.classList.add('is-bumped');
      }
      sr.textContent = badgeLabel(item, n);
    },
  };
}
