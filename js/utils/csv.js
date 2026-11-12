import { COUNTRIES, STATUSES } from '../data/patients.js';
import { formatDateTime, formatDate } from './format.js';

const cell = (v) => {
  const s = v == null ? '' : String(v);
  // Quote when needed. Prefix values that start with formula characters to block CSV injection.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^\+\d/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function patientsToCsv(patients) {
  const header = ['Patient ID', 'Name', 'NRIC/Passport', 'Contact', 'Email', 'Nationality', 'Birthday',
    'Occupation', 'VIP', 'Status', 'Registered', 'Last visit', 'Medical remarks', 'Upcoming appointments'];
  const rows = patients.map((p) => [
    p.id, p.name, p.idNumber, p.phone, p.email, COUNTRIES[p.nationality]?.name,
    p.birthday ? formatDate(p.birthday) : '', p.occupation, p.vip ? 'Yes' : 'No',
    STATUSES[p.status]?.label, formatDateTime(p.createdAt), p.lastVisit ? formatDate(p.lastVisit.at) : '',
    p.remarks, p.appointments.length,
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
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
