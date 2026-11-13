import { COUNTRIES, STATUSES } from '../data/patients.js';
import { formatDateTime, formatDate, maskIdentity } from './format.js';

/** Characters that make a spreadsheet treat a cell as a formula (OWASP CSV injection guidance). */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One CSV field. Every value that starts with a formula character is
 * neutralised with a leading apostrophe, whatever its column; phone numbers
 * such as "+60 12-345 6789" get no exemption. Fields with commas, quotes or
 * line breaks are quoted, with embedded quotes doubled (RFC 4180).
 */
export function csvCell(value) {
  const s = value == null ? '' : String(value);
  const safe = FORMULA_START.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function patientsToCsv(patients) {
  const header = ['Patient ID', 'Name', 'NRIC/Passport (masked)', 'Contact', 'Email', 'Nationality', 'Birthday',
    'Occupation', 'VIP', 'Status', 'Registered', 'Last visit', 'Allergies', 'Medical remarks', 'Upcoming appointments'];
  const rows = patients.map((p) => [
    p.id, p.name, maskIdentity(p), p.phone, p.email, COUNTRIES[p.nationality]?.name,
    p.birthday ? formatDate(p.birthday) : '', p.occupation, p.vip ? 'Yes' : 'No',
    STATUSES[p.status]?.label, formatDateTime(p.createdAt), p.lastVisit ? formatDateTime(p.lastVisit.at) : '',
    (p.allergies ?? []).join('; '), p.remarks, p.appointments.length,
  ]);
  const line = (r) => r.map((v) => csvCell(v)).join(',');
  return [line(header), ...rows.map(line)].join('\r\n');
}

export function downloadCsv(filename, csv) {
  // A BOM makes Excel open the file as UTF-8 (names, 患者管理 and so on).
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
