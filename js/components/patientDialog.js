import { html, render, $, $$ } from '../utils/dom.js';
import { COUNTRIES } from '../data/patients.js';
import { icon } from './icons.js';
import { maskIdentity, toDateInputValue, fromDateInputValue, ageFrom, documentTypeFor, identityNumberError } from '../utils/format.js';

const MAX_AGE = 130;
const MAX_ALLERGIES = 10;
const MAX_ALLERGY_LENGTH = 60;

/** "Penicillin, latex ,, Penicillin" → ["Penicillin", "latex"] (trimmed, de-duplicated, case-insensitive) */
export function parseAllergies(value) {
  const seen = new Set();
  return String(value ?? '').split(/[,;\n]/).map((s) => s.trim()).filter((s) => {
    const key = s.toLowerCase();
    if (!s || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Each rule returns an error message or ''. `ctx.editing` is the record being
 * edited (or null). When editing, a blank NRIC/passport keeps the document on
 * file only while the nationality is unchanged; any nationality change needs
 * a new number. The patient service enforces the same invariant.
 */
const FIELDS = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Enter the patient’s full name.'),
  nationality: (v) => (v ? '' : 'Choose a nationality.'),
  idNumber: (v, { editing, form }) => {
    const nationality = form.elements.nationality.value;
    const docName = !nationality ? 'NRIC or passport' : documentTypeFor(nationality) === 'NRIC' ? 'NRIC' : 'passport';
    // A typed number must match the document type the nationality requires.
    // Without a nationality, that field shows its own error first.
    if (v.trim()) return nationality ? identityNumberError(nationality, v) : '';
    if (!editing || !editing.idLast4) return `Enter the ${docName} number.`;
    if (nationality !== editing.nationality) return `The nationality changed, so enter the new ${docName} number.`;
    return '';
  },
  birthday: (v) => {
    if (!v) return 'Enter the date of birth.';
    const ts = fromDateInputValue(v);
    if (ts == null) return 'Enter a real calendar date.';
    if (ts > Date.now()) return 'Date of birth can’t be in the future.';
    if (ageFrom(ts) > MAX_AGE) return `Date of birth must be within the last ${MAX_AGE} years.`;
    return '';
  },
  phone: (v) => (/^\+?[\d\s-]{8,18}$/.test(v.trim()) ? '' : 'Enter a phone number with country code, e.g. +60 12-345 6789.'),
  email: (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
  allergies: (v) => {
    const list = parseAllergies(v);
    if (list.length > MAX_ALLERGIES) return `List up to ${MAX_ALLERGIES} allergies.`;
    if (list.some((a) => a.length > MAX_ALLERGY_LENGTH)) return `Keep each allergy under ${MAX_ALLERGY_LENGTH} characters.`;
    return '';
  },
};

/**
 * Add and edit form in a native <dialog>. The browser handles the focus
 * trap, Esc and the top layer. Validation runs on submit and then on every
 * change, and each error is linked to its field with aria-describedby.
 *
 * On close, focus returns to the element that opened the dialog. If that
 * element was re-rendered or is now inert, `restoreFocus(lost)` decides where
 * focus goes instead (for example back into the detail panel).
 */
export function PatientDialog(root, { onSubmit, restoreFocus }) {
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
            ${field('idNumber', 'NRIC / Passport', html`<input id="pf-idNumber" name="idNumber" type="text" autocomplete="off" spellcheck="false" required aria-describedby="pf-idNumber-hint" />`, false,
              'Only the last 4 characters are stored. The full number is never shown again.')}
          </div>
          <div class="form-row">
            ${field('birthday', 'Date of birth', html`<input id="pf-birthday" name="birthday" type="date" required />`)}
            ${field('phone', 'Contact number', html`<input id="pf-phone" name="phone" type="tel" placeholder="+60 12-345 6789" required />`)}
          </div>
          <div class="form-row">
            ${field('email', 'Email', html`<input id="pf-email" name="email" type="email" placeholder="name@example.com" />`, true)}
            ${field('occupation', 'Occupation', html`<input id="pf-occupation" name="occupation" type="text" />`, true)}
          </div>
          ${field('allergies', 'Allergies', html`<input id="pf-allergies" name="allergies" type="text" autocomplete="off" placeholder="e.g. Penicillin, Latex" aria-describedby="pf-allergies-hint" />`, true,
            'Separate allergies with commas. Leave blank if none are known.')}
          ${field('remarks', 'Medical remarks', html`<textarea id="pf-remarks" name="remarks" rows="3" placeholder="Conditions, current medication…"></textarea>`, true)}
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

  function field(name, label, control, optional = false, hint = '') {
    return html`
      <div class="field" data-field="${name}">
        <label for="pf-${name}" class="field__label">${label}${optional ? html` <span class="muted">(optional)</span>` : html` <span class="field__req" aria-hidden="true">*</span>`}</label>
        ${control}
        ${hint ? html`<p class="field__hint" id="pf-${name}-hint">${hint}</p>` : ''}
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
  let saving = false;

  function validate() {
    let firstInvalid = null;
    Object.entries(FIELDS).forEach(([name, rule]) => {
      const input = form.elements[name];
      const msg = rule(input.value, { editing, form });
      const err = $(`#pf-${name}-error`, dialog);
      const hint = $(`#pf-${name}-hint`, dialog);
      err.textContent = msg;
      err.hidden = !msg;
      input.setAttribute('aria-invalid', String(Boolean(msg)));
      // Keep any hint linked alongside the error.
      const describedBy = [msg ? err.id : '', hint ? hint.id : ''].filter(Boolean).join(' ');
      if (describedBy) input.setAttribute('aria-describedby', describedBy);
      else input.removeAttribute('aria-describedby');
      if (msg && !firstInvalid) firstInvalid = input;
    });
    return firstInvalid;
  }

  /** Clears every typed value, so a full document number never lingers in the closed dialog's DOM. */
  function clearForm() {
    form.reset();
    form.elements.idNumber.value = '';
  }

  form.addEventListener('input', () => { if (submitted) validate(); });
  form.addEventListener('change', () => { if (submitted) validate(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return; // already saving: ignore repeated clicks and Enter presses
    submitted = true;
    formError.hidden = true;
    const invalid = validate();
    if (invalid) { invalid.focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    data.vip = form.elements.vip.checked;
    Object.keys(data).forEach((k) => { if (typeof data[k] === 'string') data[k] = data[k].trim(); });
    data.birthday = fromDateInputValue(data.birthday);
    data.allergies = parseAllergies(data.allergies);
    if (!data.idNumber) delete data.idNumber; // blank while editing = keep the document on file

    saving = true;
    setBusy(true);
    try {
      await onSubmit(data, editing);
      form.elements.idNumber.value = ''; // the typed number is no longer needed anywhere
      dialog.close();
    } catch (err) {
      formError.innerHTML = `${icon('alertCircle', { size: 'sm' })}<span></span>`;
      formError.querySelector('span').textContent = `Couldn't save: ${err.message}`;
      formError.hidden = false;
    } finally {
      saving = false;
      setBusy(false);
    }
  });

  /**
   * While a save is in flight the dialog can't be submitted again or dismissed.
   * The buttons use aria-disabled rather than `disabled`: disabling the focused
   * Save button would drop keyboard focus out of the dialog.
   */
  function setBusy(on) {
    submitBtn.textContent = on ? 'Saving…' : editing ? 'Save changes' : 'Save patient';
    [submitBtn, ...$$('[data-dialog-close]', dialog)].forEach((b) => {
      if (on) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    });
    form.setAttribute('aria-busy', String(on));
  }

  $$('[data-dialog-close]', dialog).forEach((b) => b.addEventListener('click', () => { if (!saving) dialog.close(); }));
  dialog.addEventListener('click', (e) => { if (e.target === dialog && !saving) dialog.close(); }); // backdrop
  dialog.addEventListener('cancel', (e) => { if (saving) e.preventDefault(); }); // Esc
  dialog.addEventListener('close', () => {
    clearForm();
    const lost = returnFocus;
    returnFocus = null;
    if (lost?.isConnected && !lost.closest('[inert]')) lost.focus();
    else restoreFocus?.(lost);
  });

  return {
    open(patient = null, trigger = document.activeElement) {
      if (dialog.open) return;
      editing = patient;
      returnFocus = trigger;
      submitted = false;
      clearForm();
      formError.hidden = true;
      $$('.field__error', dialog).forEach((el) => { el.hidden = true; });
      $$('[aria-invalid]', dialog).forEach((el) => {
        el.removeAttribute('aria-invalid');
        const hint = $(`#${el.id}-hint`, dialog);
        if (hint) el.setAttribute('aria-describedby', hint.id); else el.removeAttribute('aria-describedby');
      });
      $('#dialog-title', dialog).textContent = patient ? 'Edit patient' : 'Add new patient';
      submitBtn.textContent = patient ? 'Save changes' : 'Save patient';
      form.elements.birthday.max = toDateInputValue(Date.now());

      // The full document number is never available to prefill: editing shows the
      // masked number on file and accepts a new one only if it needs replacing.
      const idInput = form.elements.idNumber;
      const idField = idInput.closest('.field');
      const onFile = patient?.idLast4 ? maskIdentity(patient) : '';
      idInput.required = !onFile;
      idInput.placeholder = onFile ? `On file: ${onFile}` : '';
      $('.field__req', idField).hidden = Boolean(onFile);
      $('#pf-idNumber-hint', dialog).textContent = onFile
        ? 'Leave blank to keep the number on file. A new number is required if you change nationality. Only the last 4 characters are stored.'
        : 'Only the last 4 characters are stored. The full number is never shown again.';

      if (patient) {
        ['name', 'nationality', 'phone', 'email', 'occupation', 'remarks'].forEach((k) => {
          form.elements[k].value = patient[k] ?? '';
        });
        form.elements.birthday.value = toDateInputValue(patient.birthday);
        form.elements.allergies.value = (patient.allergies ?? []).join(', ');
        form.elements.vip.checked = Boolean(patient.vip);
      }
      dialog.showModal();
      form.elements.name.focus();
    },
  };
}
