import { html, render, $, focusableWithin, prefersReducedMotion } from '../utils/dom.js';
import { formatDate, formatTime, ageFrom, relativeTime, formatDuration, plural } from '../utils/format.js';
import { COUNTRIES, STATUSES } from '../data/patients.js';
import { icon } from './icons.js';
import { avatar, flagImg, maskedIdentity } from './patientTable.js';

const APPT_CHIP = { Confirmed: 'success', Pending: 'warning', Rescheduled: 'primary' };
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const infoItem = (iconName, label, value) => html`
  <div class="info">
    <dt class="info__label">${icon(iconName, { size: 'sm' })}${label}</dt>
    <dd class="info__value">${value || html`<span class="muted">Not provided</span>`}</dd>
  </div>`;

const statusChip = (p) => {
  const s = STATUSES[p.status];
  return html`<span class="chip${s.chip ? ` chip--${s.chip}` : ''}" data-panel-status>
    <span class="dot dot--${p.status}"></span>${s.label}</span>`;
};

function appointmentCard(a) {
  const d = new Date(a.at);
  return html`
    <li class="appt">
      <div class="appt__date" aria-hidden="true">
        <span class="appt__day">${String(d.getDate()).padStart(2, '0')}</span>
        <span class="appt__month">${MONTHS_SHORT[d.getMonth()]}</span>
      </div>
      <div class="appt__body">
        <div class="appt__head">
          <p class="appt__treatment">${a.treatment}</p>
          <span class="chip chip--${APPT_CHIP[a.status] ?? 'primary'}">${a.status}</span>
        </div>
        <p class="appt__meta">
          <span>${icon('clock', { size: 'sm' })}<time datetime="${new Date(a.at).toISOString()}">${formatDate(a.at)}, ${formatTime(a.at)}</time></span>
          <span>${icon('doctor', { size: 'sm' })}${a.doctor}</span>
        </p>
        <p class="appt__symptoms"><span class="sr-only">Symptoms: </span>${a.symptoms}</p>
      </div>
    </li>`;
}

function detailTemplate(p) {
  const c = COUNTRIES[p.nationality];
  const allergies = p.allergies ?? [];
  return html`
    <div class="profile-card">
      ${avatar(p, 'lg')}
      <div class="profile-card__text">
        <p class="profile-card__name">${p.name} ${p.vip ? html`<span class="badge-vip">${icon('star')}VIP</span>` : ''}</p>
        <p class="profile-card__id">${p.id} · ${maskedIdentity(p)}</p>
        ${statusChip(p)}
      </div>
    </div>

    <div class="drawer__quick">
      <a class="btn btn--secondary btn--sm" href="tel:${p.phone.replace(/[^\d+]/g, '')}">${icon('phone', { size: 'sm' })}Call</a>
      <a class="btn btn--secondary btn--sm" href="mailto:${p.email}">${icon('mail', { size: 'sm' })}Email</a>
      <button type="button" class="btn btn--primary btn--sm" data-panel-action="edit">${icon('edit', { size: 'sm' })}Edit</button>
    </div>

    <section class="drawer__section" aria-labelledby="sec-info">
      <h3 class="drawer__section-title" id="sec-info">Personal information</h3>
      <dl class="info-grid">
        ${infoItem('phone', 'Contact', p.phone)}
        ${infoItem('mail', 'Email', p.email ? html`<a href="mailto:${p.email}" class="truncate" data-truncate>${p.email}</a>` : '')}
        ${infoItem('globe', 'Nationality', html`<span class="nat">${flagImg(p.nationality)}${c.name}</span>`)}
        ${infoItem('cake', 'Birthday', p.birthday ? html`${formatDate(p.birthday)} <span class="muted">· ${ageFrom(p.birthday)} years old</span>` : '')}
        ${infoItem('idCard', p.idType === 'NRIC' ? 'NRIC' : 'Passport', p.idLast4 ? maskedIdentity(p) : '')}
        ${infoItem('briefcase', 'Occupation', p.occupation)}
        ${infoItem('clock', 'Last visit', p.lastVisit
          ? html`${formatDate(p.lastVisit.at)} <span class="muted">· ${relativeTime(p.lastVisit.at)}</span><br />
                 <span class="muted">Visit duration: ${formatDuration(p.lastVisit.durationMin)}</span>`
          : html`<span class="muted">No visits yet</span>`)}
      </dl>
    </section>

    <section class="drawer__section" aria-labelledby="sec-remarks">
      <h3 class="drawer__section-title" id="sec-remarks">Medical remarks</h3>
      ${allergies.length
        ? html`<div class="remark remark--alert" data-allergies>
            ${icon('alert', { size: 'sm' })}
            <div>
              <p><strong>Allergies</strong></p>
              <ul class="allergy-list" aria-label="${plural(allergies.length, 'allergy', 'allergies')}">
                ${allergies.map((a) => html`<li class="chip chip--danger">${a}</li>`)}
              </ul>
            </div>
          </div>`
        : html`<div class="remark" data-allergies>${icon('notes', { size: 'sm' })}<p>No known allergies.</p></div>`}
      <div class="remark">
        ${icon('notes', { size: 'sm' })}
        <p>${p.remarks || 'No remarks recorded.'}</p>
      </div>
    </section>

    <section class="drawer__section" aria-labelledby="sec-appts">
      <div class="drawer__section-head">
        <h3 class="drawer__section-title" id="sec-appts">Upcoming appointments</h3>
        <span class="count-pill">${p.appointments.length}</span>
      </div>
      ${p.appointments.length
        ? html`<ul class="appt-list" aria-label="${plural(p.appointments.length, 'upcoming appointment')}">${p.appointments.map(appointmentCard)}</ul>`
        : html`<div class="state state--compact"><span class="state__icon">${icon('appointment')}</span>
               <p class="state__title">No upcoming appointments</p>
               <p class="state__text">Book a follow-up from the Appointment module.</p></div>`}
    </section>
  `;
}

const loadingTemplate = () => html`
  <div class="profile-card" aria-hidden="true">
    <span class="skel skel--circle skel--lg"></span>
    <div class="profile-card__text"><span class="skel" style="width:160px"></span><span class="skel skel--sm" style="width:120px"></span></div>
  </div>
  <div class="info-grid" aria-hidden="true">
    ${Array.from({ length: 6 }, () => html`<div class="info"><span class="skel skel--sm" style="width:70px"></span><span class="skel" style="width:140px"></span></div>`)}
  </div>
  <p class="sr-only" role="status">Loading patient details…</p>`;

/**
 * Slide-in panel on the right. A modal dialog: it traps focus, closes on Esc
 * or a backdrop click, makes the page behind it inert and returns focus to
 * whatever opened it.
 */
export function DetailPanel(root, { load, onEdit, inertTargets }) {
  render(root, html`
    <div class="drawer" id="drawer" hidden>
      <div class="drawer__backdrop" data-close></div>
      <div class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1">
        <header class="drawer__header">
          <h2 class="drawer__title" id="drawer-title">Patient details</h2>
          <button type="button" class="icon-btn" data-close aria-label="Close patient details">${icon('x')}</button>
        </header>
        <div class="drawer__body" id="drawer-body"></div>
      </div>
    </div>
  `);

  const drawer = $('#drawer', root);
  const panel = $('.drawer__panel', root);
  const body = $('#drawer-body', root);
  let returnFocus = null;
  let current = null;
  let requestId = 0;
  // A panel action (e.g. "edit") to focus once the details have re-rendered.
  let pendingFocus = null;

  /** True while focus is inside the panel or has been lost to <body>. */
  const focusIsOurs = () => panel.contains(document.activeElement) || document.activeElement === document.body
    || document.activeElement == null;

  function focusAction(action) {
    const target = action ? $(`[data-panel-action="${action}"]`, body) : null;
    (target ?? panel).focus();
  }

  function setInert(on) {
    inertTargets.forEach((el) => { el.inert = on; });
  }

  async function show(id) {
    const req = ++requestId;
    current = null;
    render(body, loadingTemplate());
    try {
      const patient = await load(id);
      if (req !== requestId) return;
      current = patient;
      render(body, detailTemplate(patient));
      if (pendingFocus && focusIsOurs()) focusAction(pendingFocus);
      pendingFocus = null;
    } catch (err) {
      if (req !== requestId) return;
      if (pendingFocus && focusIsOurs()) panel.focus();
      pendingFocus = null;
      render(body, html`
        <div class="state state--error" role="alert">
          <span class="state__icon">${icon('alertCircle')}</span>
          <p class="state__title">Couldn't load this patient</p>
          <p class="state__text">${err.message}</p>
          <button type="button" class="btn btn--primary btn--sm" data-panel-action="retry">${icon('refresh', { size: 'sm' })}Try again</button>
        </div>`);
    }
  }

  // Logical state. The element stays visible for the length of the closing
  // transition, so `drawer.hidden` alone can't say whether the panel is open.
  let isOpen = false;
  let cancelHide = null;

  function open(id, trigger) {
    drawer.dataset.id = id;
    if (!isOpen) {
      isOpen = true;
      returnFocus = trigger ?? document.activeElement;
      cancelHide?.(); // reopened during the closing transition
      drawer.hidden = false;
      setInert(true);
      requestAnimationFrame(() => { if (isOpen) drawer.classList.add('is-open'); });
      $('[data-close].icon-btn', drawer).focus();
    }
    show(id);
  }

  /** Hides the drawer once the slide-out finishes (or straight away with reduced motion). */
  function hideAfterTransition() {
    const finish = () => {
      cancelHide();
      drawer.hidden = true;
      render(body, '');
    };
    const onEnd = (e) => { if (e.target === panel) finish(); };
    const fallback = setTimeout(finish, 600); // in case transitionend never fires
    cancelHide = () => {
      clearTimeout(fallback);
      panel.removeEventListener('transitionend', onEnd);
      cancelHide = null;
    };
    if (prefersReducedMotion()) finish();
    else panel.addEventListener('transitionend', onEnd);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    requestId++;
    pendingFocus = null;
    drawer.classList.remove('is-open');
    setInert(false);
    hideAfterTransition();
    // Return focus to the row's name button. Fall back to the main region if
    // the row was re-rendered or removed.
    const target = returnFocus?.isConnected ? returnFocus : document.querySelector(`[data-open="${drawer.dataset.id}"]`);
    (target ?? document.getElementById('main'))?.focus();
    current = null;
  }

  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) return close();
    const action = e.target.closest('[data-panel-action]')?.dataset.panelAction;
    if (action === 'retry') show(drawer.dataset.id);
    if (action === 'edit' && current) onEdit(current, e.target.closest('button'));
  });

  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusableWithin(panel);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const idx = items.indexOf(document.activeElement);
    // Wrap at either end. Focus on the panel itself (idx -1) also stays inside.
    if (e.shiftKey && idx <= 0) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (idx === -1 || idx === items.length - 1)) { e.preventDefault(); first.focus(); }
  });

  return {
    open,
    close,
    get openId() { return isOpen ? drawer.dataset.id : null; },
    refresh() { if (isOpen) show(drawer.dataset.id); },
    /**
     * Puts focus back inside the panel after an overlay it opened (the edit
     * dialog) closes. `lost` is the element that opened it, which a refresh
     * may have replaced: the same action is focused once it re-renders, and
     * the panel itself holds focus in the meantime, so Esc and Tab keep working.
     */
    restoreFocus(lost) {
      if (!isOpen) return false;
      const action = lost?.dataset?.panelAction ?? null;
      const target = action ? $(`[data-panel-action="${action}"]`, body) : null;
      if (target && current) { target.focus(); return true; }
      panel.focus();
      pendingFocus = action;
      return true;
    },
    setStatus(id, status) {
      if (!isOpen || drawer.dataset.id !== id || !current) return;
      current.status = status;
      const chip = $('[data-panel-status]', body);
      if (chip) chip.outerHTML = String(statusChip(current));
      const dot = $(`[data-status-dot="${id}"]`, body);
      if (dot) dot.className = `dot dot--${status}`;
      const sr = $(`[data-status-sr="${id}"]`, body);
      if (sr) sr.textContent = `Status: ${STATUSES[status].label}.`;
    },
  };
}
