import { html, render, $, focusableWithin, prefersReducedMotion } from '../utils/dom.js';
import { formatDate, formatTime, ageFrom, relativeTime, formatDuration, plural } from '../utils/format.js';
import { COUNTRIES, STATUSES } from '../data/patients.js';
import { icon } from './icons.js';
import { avatar, flagImg } from './patientTable.js';

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
  const hasAllergy = /allerg|anaphylaxis/i.test(p.remarks ?? '');
  return html`
    <div class="profile-card">
      ${avatar(p, 'lg')}
      <div class="profile-card__text">
        <p class="profile-card__name">${p.name} ${p.vip ? html`<span class="badge-vip">${icon('star')}VIP</span>` : ''}</p>
        <p class="profile-card__id">${p.id} · ${p.idNumber}</p>
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
        ${infoItem('idCard', p.idType === 'NRIC' ? 'NRIC' : 'Passport', p.idNumber)}
        ${infoItem('briefcase', 'Occupation', p.occupation)}
        ${infoItem('clock', 'Last visit', p.lastVisit
          ? html`${formatDate(p.lastVisit.at)} <span class="muted">· ${relativeTime(p.lastVisit.at)}</span><br />
                 <span class="muted">Visit duration: ${formatDuration(p.lastVisit.durationMin)}</span>`
          : html`<span class="muted">No visits yet</span>`)}
      </dl>
    </section>

    <section class="drawer__section" aria-labelledby="sec-remarks">
      <h3 class="drawer__section-title" id="sec-remarks">Medical remarks</h3>
      <div class="remark${hasAllergy ? ' remark--alert' : ''}">
        ${icon(hasAllergy ? 'alert' : 'notes', { size: 'sm' })}
        <p>${hasAllergy ? html`<strong>Allergy alert: </strong>` : ''}${p.remarks || 'No remarks recorded.'}</p>
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
      <div class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
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
    } catch (err) {
      if (req !== requestId) return;
      render(body, html`
        <div class="state state--error" role="alert">
          <span class="state__icon">${icon('alertCircle')}</span>
          <p class="state__title">Couldn't load this patient</p>
          <p class="state__text">${err.message}</p>
          <button type="button" class="btn btn--primary btn--sm" data-panel-action="retry">${icon('refresh', { size: 'sm' })}Try again</button>
        </div>`);
    }
  }

  function open(id, trigger) {
    returnFocus = trigger ?? document.activeElement;
    drawer.dataset.id = id;
    if (drawer.hidden) {
      drawer.hidden = false;
      setInert(true);
      requestAnimationFrame(() => drawer.classList.add('is-open'));
      $('[data-close].icon-btn', drawer).focus();
    }
    show(id);
  }

  function close() {
    if (drawer.hidden) return;
    requestId++;
    drawer.classList.remove('is-open');
    setInert(false);
    const finish = () => {
      drawer.hidden = true;
      render(body, '');
    };
    if (prefersReducedMotion()) finish();
    else panel.addEventListener('transitionend', finish, { once: true });
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
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  return {
    open,
    close,
    get openId() { return drawer.hidden ? null : drawer.dataset.id; },
    refresh() { if (!drawer.hidden) show(drawer.dataset.id); },
    setStatus(id, status) {
      if (drawer.hidden || drawer.dataset.id !== id || !current) return;
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
