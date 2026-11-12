import { html, render, $, $$ } from '../utils/dom.js';
import { COUNTRIES } from '../data/patients.js';
import { icon } from './icons.js';

const FIELDS = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Enter the patient’s full name.'),
  idNumber: (v) => (v.trim().length >= 6 ? '' : 'Enter a valid NRIC or passport number.'),
  phone: (v) => (/^\+?[\d\s-]{8,18}$/.test(v.trim()) ? '' : 'Enter a phone number with country code, e.g. +60 12-345 6789.'),
  email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
  nationality: (v) => (v ? '' : 'Choose a nationality.'),
};

/**
 * Add and edit form in a native <dialog>. The browser handles the focus
 * trap, Esc and the top layer. Validation runs on submit and then on every
 * change, and each error is linked to its field with aria-describedby.
 */
export function PatientDialog(root, { onSubmit }) {
  const countries = Object.entries(COUNTRIES).sort((a, b) => a[1].name.localeCompare(b[1].name));

  render(root, html`
    <dialog class="dialog" id="patient-dialog" aria-labelledby="dialog-title">
      <form class="dialog__form" method="dialog" novalidate>
        <header class="dialog__header">
          <h2 id="dialog-title">Add new patient</h2>
          <button type="button" class="icon-btn" data-dialog-close aria-label="Close">${icon('x')}</button>
        </header>

        <div class="dialog__body">
          <div class="form-error" id="form-error" role="alert" hidden></div>
          ${field('name', 'Full name', html`<input id="pf-name" name="name" type="text" autocomplete="off" required />`)}
          <div class="form-row">
            ${field('nationality', 'Nationality', html`
              <select id="pf-nationality" name="nationality" class="select" required>
                <option value="">Select…</option>
                ${countries.map(([code, c]) => html`<option value="${code}">${c.name}</option>`)}
              </select>`)}
            ${field('idNumber', 'NRIC / Passport', html`<input id="pf-idNumber" name="idNumber" type="text" autocomplete="off" required />`)}
          </div>
          <div class="form-row">
            ${field('phone', 'Contact number', html`<input id="pf-phone" name="phone" type="tel" placeholder="+60 12-345 6789" required />`)}
            ${field('email', 'Email', html`<input id="pf-email" name="email" type="email" placeholder="name@example.com" />`, true)}
          </div>
          ${field('occupation', 'Occupation', html`<input id="pf-occupation" name="occupation" type="text" />`, true)}
          ${field('remarks', 'Medical remarks', html`<textarea id="pf-remarks" name="remarks" rows="3" placeholder="Allergies, conditions, current medication…"></textarea>`, true)}
          <label class="switch">
            <input type="checkbox" name="vip" id="pf-vip" />
            <span class="switch__track" aria-hidden="true"></span>
            Mark as VIP patient
          </label>
        </div>

        <footer class="dialog__footer">
          <button type="button" class="btn btn--secondary" data-dialog-close>Cancel</button>
          <button type="submit" class="btn btn--primary" id="dialog-submit">Save patient</button>
        </footer>
      </form>
    </dialog>
  `);

  function field(name, label, control, optional = false) {
    return html`
      <div class="field" data-field="${name}">
        <label for="pf-${name}" class="field__label">${label}${optional ? html` <span class="muted">(optional)</span>` : html` <span class="field__req" aria-hidden="true">*</span>`}</label>
        ${control}
        <p class="field__error" id="pf-${name}-error" hidden></p>
      </div>`;
  }

  const dialog = $('#patient-dialog', root);
  const form = $('form', dialog);
  const submitBtn = $('#dialog-submit', dialog);
  const formError = $('#form-error', dialog);
  let editing = null;
  let returnFocus = null;
  let submitted = false;

  function validate() {
    let firstInvalid = null;
    Object.entries(FIELDS).forEach(([name, rule]) => {
      const input = form.elements[name];
      const msg = rule(input.value);
      const err = $(`#pf-${name}-error`, dialog);
      err.textContent = msg;
      err.hidden = !msg;
      input.setAttribute('aria-invalid', String(Boolean(msg)));
      if (msg) input.setAttribute('aria-describedby', err.id);
      else input.removeAttribute('aria-describedby');
      if (msg && !firstInvalid) firstInvalid = input;
    });
    return firstInvalid;
  }

  form.addEventListener('input', () => { if (submitted) validate(); });
  form.addEventListener('change', () => { if (submitted) validate(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitted = true;
    formError.hidden = true;
    const invalid = validate();
    if (invalid) { invalid.focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    data.vip = form.elements.vip.checked;
    Object.keys(data).forEach((k) => { if (typeof data[k] === 'string') data[k] = data[k].trim(); });

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
    try {
      await onSubmit(data, editing);
      dialog.close();
    } catch (err) {
      formError.innerHTML = `${icon('alertCircle', { size: 'sm' })}<span></span>`;
      formError.querySelector('span').textContent = `Couldn't save: ${err.message}`;
      formError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editing ? 'Save changes' : 'Save patient';
    }
  });

  $$('[data-dialog-close]', dialog).forEach((b) => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // backdrop
  dialog.addEventListener('close', () => {
    if (returnFocus?.isConnected) returnFocus.focus();
    else document.getElementById('main')?.focus();
  });

  return {
    open(patient = null, trigger = document.activeElement) {
      editing = patient;
      returnFocus = trigger;
      submitted = false;
      form.reset();
      formError.hidden = true;
      $$('.field__error', dialog).forEach((el) => { el.hidden = true; });
      $$('[aria-invalid]', dialog).forEach((el) => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
      $('#dialog-title', dialog).textContent = patient ? 'Edit patient' : 'Add new patient';
      submitBtn.textContent = patient ? 'Save changes' : 'Save patient';
      if (patient) {
        ['name', 'nationality', 'idNumber', 'phone', 'email', 'occupation', 'remarks'].forEach((k) => {
          form.elements[k].value = patient[k] ?? '';
        });
        form.elements.vip.checked = Boolean(patient.vip);
      }
      dialog.showModal();
      form.elements.name.focus();
    },
  };
}
