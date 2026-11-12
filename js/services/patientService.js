import { COUNTRIES, STATUSES, generatePatients } from '../data/patients.js';

/**
 * Mock REST-like service. Every call is async with simulated latency, so the
 * UI has real loading, empty and error states to handle.
 *
 * URL flags (for reviewers):
 *   ?delay=2000   network latency in ms (default 550)
 *   ?fail         list/detail requests fail → error state
 *   ?empty        database starts empty → empty state
 *   ?failOps      write operations (edit, delete, VIP) fail → error toasts
 */
const params = new URLSearchParams(window.location.search);
const config = {
  delay: Number(params.get('delay')) || 550,
  fail: params.has('fail'),
  empty: params.has('empty'),
  failOps: params.has('failOps'),
};

let db = config.empty ? [] : generatePatients();
let nextId = 1001 + db.length;

export class ServiceError extends Error {
  constructor(message, code = 'SERVICE_ERROR') {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () => config.delay * (0.7 + Math.random() * 0.6);
const clone = (v) => structuredClone(v);

async function request(fn, { write = false, signal } = {}) {
  await sleep(jitter());
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if ((write && config.failOps) || (!write && config.fail)) {
    throw new ServiceError(
      write ? 'The server rejected the change. Please try again.' : 'Unable to reach the patient records server.',
      write ? 'WRITE_FAILED' : 'NETWORK_ERROR',
    );
  }
  return fn();
}

function matches(p, { search = '', nationality = '', status = '', vip = false }) {
  if (nationality && p.nationality !== nationality) return false;
  if (status && p.status !== status) return false;
  if (vip && !p.vip) return false;
  if (!search) return true;
  const q = search.toLowerCase();
  const haystack = [p.name, p.idNumber, p.id, p.phone.replace(/\s|-/g, ''), p.phone, p.email, COUNTRIES[p.nationality].name]
    .join(' ').toLowerCase();
  return haystack.includes(q.replace(/\s|-/g, '')) || haystack.includes(q);
}

const SORTERS = {
  name: (a, b) => a.name.localeCompare(b.name),
  nationality: (a, b) => COUNTRIES[a.nationality].name.localeCompare(COUNTRIES[b.nationality].name) || a.name.localeCompare(b.name),
  createdAt: (a, b) => a.createdAt - b.createdAt,
};

function query(q) {
  const sorter = SORTERS[q.sortKey] ?? SORTERS.createdAt;
  const dir = q.sortDir === 'asc' ? 1 : -1;
  return db.filter((p) => matches(p, q)).sort((a, b) => sorter(a, b) * dir);
}

export const patientService = {
  config,

  /** Paginated list. Resolves to { items, total, page, pageCount, unfilteredTotal }. */
  list(q, opts) {
    return request(() => {
      const all = query(q);
      const pageCount = Math.max(1, Math.ceil(all.length / q.pageSize));
      const page = Math.min(Math.max(1, q.page), pageCount);
      const start = (page - 1) * q.pageSize;
      return clone({ items: all.slice(start, start + q.pageSize), total: all.length, page, pageCount, unfilteredTotal: db.length });
    }, opts);
  },

  /** Every record matching a query (no pagination). Used by Export. */
  listAll(q) {
    return request(() => clone(query(q)));
  },

  get(id, opts) {
    return request(() => {
      const p = db.find((x) => x.id === id);
      if (!p) throw new ServiceError('This patient record no longer exists.', 'NOT_FOUND');
      return clone(p);
    }, opts);
  },

  create(data) {
    return request(() => {
      const patient = {
        id: `PT-${nextId++}`,
        idType: data.nationality === 'MY' ? 'NRIC' : 'Passport',
        createdAt: Date.now(),
        lastVisit: null,
        status: 'offline',
        appointments: [],
        occupation: '',
        remarks: '',
        birthday: null,
        ...data,
      };
      db.unshift(patient);
      return clone(patient);
    }, { write: true });
  },

  update(id, patch) {
    return request(() => {
      const p = db.find((x) => x.id === id);
      if (!p) throw new ServiceError('This patient record no longer exists.', 'NOT_FOUND');
      Object.assign(p, patch);
      return clone(p);
    }, { write: true });
  },

  updateMany(ids, patch) {
    return request(() => {
      db.filter((p) => ids.includes(p.id)).forEach((p) => Object.assign(p, patch));
      return ids.length;
    }, { write: true });
  },

  /** Removes records and returns them with their positions, so the change can be undone. */
  remove(ids) {
    return request(() => {
      const removed = [];
      db = db.filter((p, index) => {
        if (!ids.includes(p.id)) return true;
        removed.push({ patient: p, index });
        return false;
      });
      return removed;
    }, { write: true });
  },

  restore(removed) {
    return request(() => {
      removed.sort((a, b) => a.index - b.index).forEach(({ patient, index }) => db.splice(index, 0, patient));
      return removed.length;
    }, { write: true });
  },

  queueCount: () => db.filter((p) => p.status === 'waiting').length,

  /**
   * Simulated real-time feed (stands in for a WebSocket). It moves patients
   * through offline → waiting → consulting → done → offline and keeps the
   * queue small enough to be realistic.
   */
  subscribeToStatus(callback, interval = 7000) {
    const FLOW = { offline: 'waiting', waiting: 'consulting', consulting: 'done', done: 'offline' };
    const tick = () => {
      if (document.hidden || db.length === 0) return;
      // Pick which stage to advance, keeping the queue between 1 and 3 patients.
      const waiting = db.filter((p) => p.status === 'waiting').length;
      const stages = waiting <= 1 ? ['offline'] : waiting >= 3 ? ['waiting'] : ['offline', 'waiting', 'consulting', 'done'];
      const stage = stages[Math.floor(Math.random() * stages.length)];
      const candidates = db.filter((p) => p.status === stage);
      const p = candidates[Math.floor(Math.random() * candidates.length)];
      if (!p) return;
      p.status = FLOW[p.status];
      callback({ id: p.id, status: p.status, label: STATUSES[p.status].label, queueCount: this.queueCount(), name: p.name });
    };
    const timer = setInterval(tick, interval);
    return () => clearInterval(timer);
  },
};
