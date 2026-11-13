// CSV export escaping and formula-injection protection.
// Zero dependencies: run with `node --test "tests/*.test.mjs"`.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const { csvCell, patientsToCsv } = await import('../js/utils/csv.js');
const { generatePatients } = await import('../js/data/patients.js');

/** Minimal RFC 4180 parser, to read back what a spreadsheet would receive. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\r' && text[i + 1] === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; } else cur += ch;
  }
  row.push(cur);
  rows.push(row);
  return rows;
}

const FORMULA_START = /^[=+\-@\t\r]/;

describe('csvCell formula-injection protection', () => {
  const payloads = [
    '=1+1', '=HYPERLINK("http://example.com","x")', '+1+1', "+1+cmd|' /C calc'!A0", '+cmd|calc', '-2+3',
    '@SUM(A1:A2)', '\t=1+1', '\r=1+1', '+60 12-345 6789',
  ];

  for (const p of payloads) {
    test(`neutralises ${JSON.stringify(p)} in a free-text column`, () => {
      const [[value]] = parseCsv(csvCell(p));
      assert.equal(value, `'${p}`);
      assert.ok(!FORMULA_START.test(value));
    });
  }

  test('csvCell takes no column options, so no value can opt out', () => {
    assert.equal(csvCell.length, 1);
    assert.equal(csvCell('+60 12-345 6789', { phone: true }), "'+60 12-345 6789");
  });
});

describe('csvCell: the brief’s explicit cases', () => {
  // Each value must come back with a leading apostrophe and otherwise intact,
  // so a spreadsheet neither evaluates it nor rewrites it as arithmetic.
  const cases = [
    '+44-20-7946-0958', '+1-415-555-0100', '+60-12-345-6789', '+60 16-694 7068',
    '=1+1', '-1+2', '@SUM(A1:A2)', '\t+60 12-345 6789', '\r-1+2', '\tplain', '\rplain',
  ];
  for (const v of cases) {
    test(`neutralises ${JSON.stringify(v)} and preserves it`, () => {
      const [[cell]] = parseCsv(csvCell(v));
      assert.equal(cell, `'${v}`);
      assert.ok(!FORMULA_START.test(cell));
    });
  }

  test('the same values in the Contact column of a full export are neutralised', () => {
    const base = generatePatients(Date.UTC(2026, 10, 12))[0];
    const rows = parseCsv(patientsToCsv(cases.map((phone) => ({ ...base, phone }))));
    rows.slice(1).forEach((r, i) => assert.equal(r[3], `'${cases[i]}`));
  });

  test('a multiline remark with quotes and commas round-trips inside one field', () => {
    const base = generatePatients(Date.UTC(2026, 10, 12))[0];
    const remarks = 'Line one, "quoted"\nLine two\r\n=not a formula here';
    const [header, row] = parseCsv(patientsToCsv([{ ...base, remarks, occupation: null, email: '' }]));
    assert.equal(row.length, header.length);
    assert.equal(row[13], remarks);
    assert.equal(row[7], '');
    assert.equal(row[4], '');
  });
});

describe('csvCell phone numbers', () => {
  // The value a spreadsheet shows once the neutralising apostrophe is removed.
  const readBack = (p) => {
    const [[value]] = parseCsv(csvCell(p));
    assert.ok(!FORMULA_START.test(value), `${JSON.stringify(p)} → ${JSON.stringify(value)}`);
    return value.startsWith("'") ? value.slice(1) : value;
  };

  test('hyphen-separated international numbers are neutralised and stay intact', () => {
    for (const p of ['+60 12-345 6789', '+60-12-345-6789', '+1-415-555-0100', '+86-583-502-1406']) {
      assert.equal(csvCell(p), `'${p}`);
      assert.equal(readBack(p), p);
    }
  });

  test('space-separated international numbers are neutralised and stay intact', () => {
    for (const p of ['+65 912 345 6789', '+1 415 555 0100', '+44 20 7946 0958']) {
      assert.equal(csvCell(p), `'${p}`);
      assert.equal(readBack(p), p);
    }
  });

  test('ordinary numbers without a formula character are exported unchanged', () => {
    for (const p of ['012-345 6789', '0123456789', '60 12-345 6789', '(03) 2161 0000']) {
      assert.equal(csvCell(p), p);
      assert.equal(readBack(p), p);
    }
  });

  test('phone-shaped formula payloads are neutralised', () => {
    for (const p of ['+60 12-345 6789=1', '+1+1', '-60 12-345 6789', '+60  12', "+1+cmd|' /C calc'!A0"]) {
      assert.equal(readBack(p), p);
    }
  });
});

describe('csvCell quoting (RFC 4180)', () => {
  test('commas, quotes and newlines round-trip', () => {
    for (const v of ['a,b', 'say "hi"', 'line1\nline2', 'line1\r\nline2', '"', ',']) {
      const [[value]] = parseCsv(csvCell(v));
      assert.equal(value, v);
    }
  });

  test('plain, empty and missing values', () => {
    assert.equal(csvCell('Tan Wei Ming'), 'Tan Wei Ming');
    assert.equal(csvCell(''), '');
    assert.equal(csvCell(null), '');
    assert.equal(csvCell(undefined), '');
    assert.equal(csvCell(3), '3');
  });

  test('a formula payload that also needs quoting is both prefixed and quoted', () => {
    const v = '=HYPERLINK("x", "y")';
    assert.equal(csvCell(v), `"'=HYPERLINK(""x"", ""y"")"`);
  });
});

describe('patientsToCsv', () => {
  const patients = generatePatients(Date.UTC(2026, 10, 12));

  test('every row has the header’s column count and phones are neutralised but intact', () => {
    const rows = parseCsv(patientsToCsv(patients));
    const [header, ...data] = rows;
    assert.equal(header[3], 'Contact');
    assert.equal(data.length, patients.length);
    data.forEach((r, i) => {
      assert.equal(r.length, header.length);
      assert.ok(!FORMULA_START.test(r[3]), `phone not a formula: ${r[3]}`);
      assert.equal(r[3], `'${patients[i].phone}`);
    });
  });

  test('no cell in the full export starts with a formula character', () => {
    for (const r of parseCsv(patientsToCsv(patients))) {
      for (const cell of r) assert.ok(!FORMULA_START.test(cell), JSON.stringify(cell));
    }
  });

  test('no full NRIC/passport number appears, and identities are masked', () => {
    const csv = patientsToCsv(patients);
    assert.ok(!/\b\d{6}-?\d{2}-?\d{4}\b|\b[A-Z]\d{8}\b/.test(csv));
    const rows = parseCsv(csv).slice(1);
    for (const r of rows) assert.match(r[2], /^•+(-••-)?[0-9A-Z]{4}$|^••••••-••-\d{4}$/);
  });

  test('a malicious name, allergy or remark is neutralised in the full export', () => {
    const evil = { ...patients[0], name: "+1+cmd|' /C calc'!A0", allergies: ['=1+1', 'Latex'], remarks: '@SUM(A1)', occupation: '-2+3' };
    const [, row] = parseCsv(patientsToCsv([evil]));
    for (const i of [1, 7, 12, 13]) assert.ok(!FORMULA_START.test(row[i]), `column ${i}: ${row[i]}`);
  });
});

describe('downloadCsv', () => {
  test('prepends a UTF-8 BOM and keeps the CSV text unchanged', async () => {
    const { downloadCsv } = await import('../js/utils/csv.js');
    const saved = { Blob: globalThis.Blob, URL: globalThis.URL, document: globalThis.document, setTimeout: globalThis.setTimeout };
    let parts;
    let type;
    globalThis.Blob = class { constructor(p, o) { parts = p; type = o.type; } };
    globalThis.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
    globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
    globalThis.setTimeout = () => {};
    try {
      const csv = patientsToCsv(generatePatients(Date.UTC(2026, 10, 12)).slice(0, 2));
      downloadCsv('patients.csv', csv);
      assert.equal(parts[0], '\uFEFF');
      assert.equal(parts[1], csv);
      assert.equal(type, 'text/csv;charset=utf-8');
    } finally {
      Object.assign(globalThis, saved);
    }
  });
});
