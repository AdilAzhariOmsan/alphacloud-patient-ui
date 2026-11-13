const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

/** "12 Nov 2026" */
export function formatDate(ts) {
  const d = new Date(ts);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "09:30 AM" */
export function formatTime(ts) {
  const d = new Date(ts);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Spec format: DD MMM YYYY HH:MM AM/PM → "12 Nov 2026 09:30 AM" */
export const formatDateTime = (ts) => `${formatDate(ts)} ${formatTime(ts)}`;

export const toIso = (ts) => new Date(ts).toISOString();

export function ageFrom(ts, now = Date.now()) {
  const b = new Date(ts);
  const n = new Date(now);
  let age = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) age -= 1;
  return age;
}

/** "3 months ago", "yesterday", "in 4 days" */
export function relativeTime(ts, now = Date.now()) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffDays = Math.round((ts - now) / 86_400_000);
  const abs = Math.abs(diffDays);
  if (abs < 1) return 'today';
  if (abs < 7) return rtf.format(diffDays, 'day');
  if (abs < 30) return rtf.format(Math.round(diffDays / 7), 'week');
  if (abs < 365) return rtf.format(Math.round(diffDays / 30), 'month');
  return rtf.format(Math.round(diffDays / 365), 'year');
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "Tan Wei Ming" → "TW", "Ahmad Faizal bin Rahman" → "AR" */
export function initials(name) {
  const stop = new Set(['bin', 'binti', 'a/l', 'a/p', 'van', 'thi']);
  const letter = (word) => word.match(/\p{L}/u)?.[0] ?? '';
  const parts = name.split(/\s+/).filter((p) => letter(p) && !stop.has(p.toLowerCase()));
  if (parts.length === 0) return '?';
  const first = letter(parts[0]);
  const last = parts.length > 1 ? letter(parts[parts.length - 1]) : '';
  return (first + last).toUpperCase();
}

/* Avatar palette — every pair passes 4.5:1 for the initials. */
const AVATAR_COLOURS = [
  ['#E8F0FE', '#0052CC'],
  ['#E3F6EE', '#1E7A52'],
  ['#FFF1E0', '#9A4A00'],
  ['#F3E8FD', '#6B21A8'],
  ['#FDE8EC', '#A3123A'],
  ['#E0F4F7', '#0E6474'],
  ['#EEF0F3', '#3D4654'],
];

export function avatarColours(seed) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
}

/**
 * Identity documents are never stored or shown in full. Records keep only the
 * document type and the last four characters, and every presentation path
 * (table, panel, export) goes through these helpers.
 */
export const ID_LABELS = { NRIC: 'NRIC', Passport: 'Passport' };

/** "••••••-••-6202" (NRIC) or "•••••6202" (passport) */
export function maskIdentity(p) {
  if (!p?.idLast4) return '';
  return p.idType === 'NRIC' ? `••••••-••-${p.idLast4}` : `•••••${p.idLast4}`;
}

/** Spoken form for screen readers: "NRIC ending in 6202" */
export function identityDescription(p) {
  if (!p?.idLast4) return 'No identity document on file';
  return `${ID_LABELS[p.idType] ?? 'ID'} ending in ${p.idLast4.split('').join(' ')}`;
}

/** Reduces a typed document number to what the record keeps: its last 4 letters or digits. */
export const lastFourOf = (value) => String(value).replace(/[^0-9a-z]/gi, '').slice(-4).toUpperCase();

/** Malaysian nationals are identified by NRIC; everyone else by passport. */
export const documentTypeFor = (nationality) => (nationality === 'MY' ? 'NRIC' : 'Passport');

/**
 * Checks a typed document number against the document type the nationality
 * requires. Shared by the form and the patient service so both layers apply
 * the same rule. Returns '' when valid, otherwise an error message.
 *   NRIC:     12 digits, optionally grouped as 900101-14-5678
 *   Passport: 6–9 letters or digits (ICAO maximum), including at least one digit
 */
export function identityNumberError(nationality, value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Enter the NRIC or passport number.';
  if (documentTypeFor(nationality) === 'NRIC') {
    return /^\d{6}-?\d{2}-?\d{4}$/.test(raw) ? '' : 'Enter a 12-digit NRIC number, e.g. 900101-14-5678.';
  }
  const compact = raw.replace(/[\s-]/g, '');
  return /^[a-z0-9]{6,9}$/i.test(compact) && /\d/.test(compact) ? '' : 'Enter a passport number of 6–9 letters or digits.';
}

/** Local-date helpers for <input type="date"> */
export function toDateInputValue(ts) {
  if (ts == null) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2006-08-15" → local-midnight timestamp, or null if the string is not a real calendar date. */
export function fromDateInputValue(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date.getTime() : null;
}

export const plural = (n, word, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;
