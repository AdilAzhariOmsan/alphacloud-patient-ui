// Identity-document invariants for the patient service and the shared
// validator. Zero dependencies: run with `node --test "tests/*.test.mjs"`.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

// The service reads URL flags and tab visibility at import time; stub the
// two browser globals it touches. ?delay=1 keeps the simulated latency short.
globalThis.window = { location: { search: '?delay=1' } };
globalThis.document = { hidden: false };

const { patientService } = await import('../js/services/patientService.js');
const { identityNumberError, documentTypeFor, maskIdentity } = await import('../js/utils/format.js');

const ALL = { search: '', nationality: '', status: '', vip: false, sortKey: 'name', sortDir: 'asc' };
const firstOf = async (nationality) => (await patientService.listAll({ ...ALL, nationality }))[0];

const editPatch = (p, overrides) => ({
  name: p.name, nationality: p.nationality, phone: p.phone, email: p.email, occupation: p.occupation,
  remarks: p.remarks, allergies: p.allergies, birthday: p.birthday, vip: p.vip, ...overrides,
});

describe('identityNumberError (shared by form and service)', () => {
  test('Malaysia requires a 12-digit NRIC', () => {
    assert.equal(documentTypeFor('MY'), 'NRIC');
    assert.equal(identityNumberError('MY', '900101-14-5678'), '');
    assert.equal(identityNumberError('MY', '900101145678'), '');
    assert.notEqual(identityNumberError('MY', 'A1234567'), '');
    assert.notEqual(identityNumberError('MY', '90010114567'), '');
  });

  test('other nationalities require a 6–9 character passport with a digit', () => {
    assert.equal(documentTypeFor('SG'), 'Passport');
    assert.equal(identityNumberError('SG', 'K1234567'), '');
    assert.notEqual(identityNumberError('SG', '900101-14-5678'), '', 'an NRIC is not a passport');
    assert.notEqual(identityNumberError('PH', 'ABCDEFG'), '', 'needs at least one digit');
    assert.notEqual(identityNumberError('PH', 'P12'), '', 'too short');
  });

  test('blank is rejected', () => {
    assert.notEqual(identityNumberError('MY', '   '), '');
  });
});

describe('patientService nationality/document invariant', () => {
  let my;
  let sg;
  before(async () => {
    my = await firstOf('MY');
    sg = await firstOf('SG');
    assert.ok(my && sg, 'seed data contains MY and SG patients');
  });

  test('1. Malaysia → Singapore without a new document is rejected', async () => {
    await assert.rejects(patientService.update(my.id, editPatch(my, { nationality: 'SG' })), { code: 'IDENTITY_REQUIRED' });
    const after = await patientService.get(my.id);
    assert.equal(after.nationality, 'MY', 'record unchanged');
    assert.equal(after.idLast4, my.idLast4);
  });

  test('2. Singapore → Philippines without a new document is rejected', async () => {
    await assert.rejects(patientService.update(sg.id, editPatch(sg, { nationality: 'PH' })), { code: 'IDENTITY_REQUIRED' });
    const after = await patientService.get(sg.id);
    assert.equal(after.nationality, 'SG', 'record unchanged');
    assert.equal(after.idLast4, sg.idLast4, 'the Singapore passport is not re-labelled as Philippine');
  });

  test('3. Singapore → Philippines with a new document is accepted', async () => {
    const saved = await patientService.update(sg.id, editPatch(sg, { nationality: 'PH', idNumber: 'P9876543' }));
    assert.equal(saved.nationality, 'PH');
    assert.equal(saved.idType, 'Passport');
    assert.equal(saved.idLast4, '6543');
    assert.ok(!('idNumber' in saved), 'full number is not stored');
  });

  test('4. Malaysia → Singapore with a new document is accepted', async () => {
    const saved = await patientService.update(my.id, editPatch(my, { nationality: 'SG', idNumber: 'K1234567' }));
    assert.equal(saved.nationality, 'SG');
    assert.equal(saved.idType, 'Passport');
    assert.equal(saved.idLast4, '4567');
    assert.equal(maskIdentity(saved), '•••••4567');
  });

  test('5. unchanged nationality with a blank document keeps the last four digits and the record', async () => {
    const p = await firstOf('IN');
    const saved = await patientService.update(p.id, editPatch(p, { remarks: 'Reviewed.', idNumber: '' }));
    assert.equal(saved.idLast4, p.idLast4);
    assert.equal(saved.idType, p.idType);
    assert.equal(saved.remarks, 'Reviewed.');
    assert.deepEqual(saved.appointments, p.appointments, 'appointments preserved');
    assert.deepEqual(saved.lastVisit, p.lastVisit, 'last visit preserved');
    assert.equal(saved.createdAt, p.createdAt);
  });

  test('a new document must match the new nationality’s document type', async () => {
    const p = await firstOf('TH');
    await assert.rejects(patientService.update(p.id, editPatch(p, { nationality: 'MY', idNumber: 'T1234567' })), { code: 'INVALID_IDENTITY' });
    assert.equal((await patientService.get(p.id)).nationality, 'TH');
  });

  test('create requires a valid document and stores only the last four characters', async () => {
    const base = { name: 'Test Patient', nationality: 'MY', phone: '+60 12-345 6789', birthday: 0, allergies: [], vip: false };
    await assert.rejects(patientService.create(base), { code: 'IDENTITY_REQUIRED' });
    const created = await patientService.create({ ...base, idNumber: '900101-14-5678' });
    assert.equal(created.idType, 'NRIC');
    assert.equal(created.idLast4, '5678');
    assert.ok(!('idNumber' in created));
  });

  test('non-identity updates (VIP toggle) are unaffected', async () => {
    const p = await firstOf('JP');
    const saved = await patientService.update(p.id, { vip: !p.vip });
    assert.equal(saved.vip, !p.vip);
    assert.equal(saved.idLast4, p.idLast4);
  });
});
