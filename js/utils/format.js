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

export const plural = (n, word, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;
