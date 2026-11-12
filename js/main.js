import { $ } from './utils/dom.js';
import { plural } from './utils/format.js';
import { patientsToCsv, downloadCsv } from './utils/csv.js';
import { patientService } from './services/patientService.js';
import { Sidebar } from './components/sidebar.js';
import { Header } from './components/header.js';
import { Toolbar } from './components/toolbar.js';
import { PatientTable } from './components/patientTable.js';
import { Pagination } from './components/pagination.js';
import { DetailPanel } from './components/detailPanel.js';
import { PatientDialog } from './components/patientDialog.js';
import { openMenu } from './components/actionMenu.js';
import { toast } from './components/toast.js';
import { initTooltips } from './components/tooltip.js';

/* ------------------------------------------------------------------ state */
const DEFAULT_QUERY = { search: '', nationality: '', status: '', vip: false, sortKey: 'createdAt', sortDir: 'desc', page: 1, pageSize: 8 };

const state = {
  query: { ...DEFAULT_QUERY },
  status: 'loading', // 'loading' | 'ready' | 'error'
  items: [],
  total: 0,
  pageCount: 1,
  unfilteredTotal: 0,
  error: null,
  selected: new Set(),
};

const hasFilters = () => Boolean(state.query.search || state.query.nationality || state.query.status || state.query.vip);
const user = { name: 'Dr. Sarah Lim', role: 'General Practitioner', initials: 'SL' };

/* ------------------------------------------------------------- components */
const sidebar = Sidebar($('#sidebar'), {
  active: 'patient',
  counts: { queue: patientService.queueCount(), appointment: 5 },
  onNavigate: (item) => toast(`${item.label} isn't part of this demo. Only the Patient module is implemented.`),
});

const header = Header($('#topbar'), {
  user,
  onSearch: (search) => {
    if (search === state.query.search) return;
    setQuery({ search, page: 1 }, { clearSelection: true });
  },
  onAdd: (trigger) => dialog.open(null, trigger),
  onToggleSidebar: toggleSidebar,
  onNotifications: () => toast('Notifications and account settings are outside the scope of this demo.'),
});

const toolbar = Toolbar($('#toolbar'), {
  onFilter: (key, value) => setQuery({ [key]: value, page: 1 }, { clearSelection: true }),
  onClear: clearFilters,
  onExport: () => exportPatients(),
  onBulkMenu: (trigger) => openMenu(trigger, [
    { id: 'vip-on', label: 'Mark as VIP', icon: 'star' },
    { id: 'vip-off', label: 'Remove VIP', icon: 'star' },
    { id: 'export', label: 'Export selected', icon: 'download' },
    'separator',
    { id: 'delete', label: 'Delete selected', icon: 'trash', danger: true },
  ], handleBulkAction, { label: 'Bulk actions' }),
  onClearSelection: () => { state.selected.clear(); renderAll(); },
});

const table = PatientTable($('#table'), {
  onSort: (key) => {
    const { sortKey, sortDir } = state.query;
    const dir = sortKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : key === 'createdAt' ? 'desc' : 'asc';
    setQuery({ sortKey: key, sortDir: dir, page: 1 });
  },
  onOpen: (id, trigger) => panel.open(id, trigger),
  onMenu: (id, trigger) => openRowMenu(id, trigger),
  onSelect: (id, checked) => {
    if (checked) state.selected.add(id); else state.selected.delete(id);
    renderAll();
  },
  onSelectAll: (checked) => {
    state.items.forEach((p) => (checked ? state.selected.add(p.id) : state.selected.delete(p.id)));
    renderAll();
  },
  onStateAction: (action) => {
    if (action === 'retry') load();
    if (action === 'clear') clearFilters();
    if (action === 'add') dialog.open(null, $('#add-patient'));
  },
});

const pagination = Pagination($('#pagination'), {
  onPage: (page) => {
    setQuery({ page });
    $('#table-wrap').scrollTo({ top: 0 });
  },
  onPageSize: (pageSize) => setQuery({ pageSize, page: 1 }),
});

const panel = DetailPanel($('#drawer-root'), {
  load: (id) => patientService.get(id),
  onEdit: (patient, trigger) => dialog.open(patient, trigger),
  inertTargets: [$('#sidebar'), $('#shell')],
});

const dialog = PatientDialog($('#dialog-root'), {
  async onSubmit(data, editing) {
    if (editing) {
      const saved = await patientService.update(editing.id, data);
      toast(`Saved changes to ${saved.name}.`, { type: 'success' });
      panel.refresh();
    } else {
      const created = await patientService.create(data);
      // Show the newest record first, so the new patient is visible straight away.
      state.query = { ...DEFAULT_QUERY, pageSize: state.query.pageSize };
      header.setSearch('');
      toast(`${created.name} was added.`, {
        type: 'success',
        action: { label: 'View', onClick: () => panel.open(created.id, $('#add-patient')) },
      });
    }
    load();
  },
});

initTooltips();

/* ---------------------------------------------------------------- loading */
let requestId = 0;

async function load() {
  const id = ++requestId;
  state.status = 'loading';
  renderAll();
  try {
    const res = await patientService.list(state.query);
    if (id !== requestId) return; // a newer request superseded this one
    Object.assign(state, {
      status: 'ready', error: null,
      items: res.items, total: res.total, pageCount: res.pageCount, unfilteredTotal: res.unfilteredTotal,
    });
    state.query.page = res.page;
  } catch (err) {
    if (id !== requestId) return;
    Object.assign(state, { status: 'error', error: err, items: [], total: 0 });
  }
  renderAll();
}

function renderAll() {
  const view = { ...state, hasFilters: hasFilters() };
  table.update(view);
  pagination.update({
    status: state.status, page: state.query.page, pageCount: state.pageCount,
    shown: state.items.length, total: state.total, pageSize: state.query.pageSize,
  });
  toolbar.update({ ...view, selectedCount: state.selected.size });
}

function setQuery(patch, { clearSelection = false } = {}) {
  state.query = { ...state.query, ...patch };
  if (clearSelection) state.selected.clear();
  load();
}

function clearFilters() {
  header.setSearch('');
  setQuery({ search: '', nationality: '', status: '', vip: false, page: 1 }, { clearSelection: true });
  $('#patient-search').focus();
}

/* ---------------------------------------------------------------- actions */
function openRowMenu(id, trigger) {
  const p = state.items.find((x) => x.id === id);
  if (!p) return;
  openMenu(trigger, [
    { id: 'view', label: 'View details', icon: 'eye' },
    { id: 'edit', label: 'Edit patient', icon: 'edit' },
    { id: 'vip', label: p.vip ? 'Remove VIP status' : 'Mark as VIP', icon: 'star' },
    { id: 'export', label: 'Export record', icon: 'download' },
    'separator',
    { id: 'delete', label: 'Delete patient', icon: 'trash', danger: true },
  ], async (action) => {
    switch (action) {
      case 'view': panel.open(p.id, trigger); break;
      case 'edit': dialog.open(p, trigger); break;
      case 'export': exportPatients([p]); break;
      case 'delete': deletePatients([p.id], p.name); break;
      case 'vip':
        try {
          await patientService.update(p.id, { vip: !p.vip });
          toast(p.vip ? `${p.name} is no longer a VIP.` : `${p.name} is now a VIP.`, { type: 'success' });
          load();
        } catch (err) {
          toast(`Couldn't update ${p.name}: ${err.message}`, { type: 'error' });
        }
        break;
      default: break;
    }
  }, { label: `Actions for ${p.name}` });
}

async function handleBulkAction(action) {
  const ids = [...state.selected];
  const label = plural(ids.length, 'patient');
  try {
    if (action === 'vip-on' || action === 'vip-off') {
      await patientService.updateMany(ids, { vip: action === 'vip-on' });
      toast(`${action === 'vip-on' ? 'Marked' : 'Removed VIP for'} ${label}${action === 'vip-on' ? ' as VIP' : ''}.`, { type: 'success' });
      load();
    } else if (action === 'export') {
      const all = await patientService.listAll({ ...DEFAULT_QUERY });
      exportPatients(all.filter((p) => state.selected.has(p.id)));
    } else if (action === 'delete') {
      deletePatients(ids, label);
    }
  } catch (err) {
    toast(`Bulk action failed: ${err.message}`, { type: 'error' });
  }
}

async function deletePatients(ids, label) {
  try {
    const removed = await patientService.remove(ids);
    ids.forEach((id) => state.selected.delete(id));
    if (ids.includes(panel.openId)) panel.close();
    $('#table-wrap').focus();
    load();
    toast(`${label} deleted.`, {
      type: 'success',
      action: {
        label: 'Undo',
        onClick: async () => {
          try {
            await patientService.restore(removed);
            toast(`${label} restored.`, { type: 'success' });
            load();
          } catch (err) {
            toast(`Couldn't restore: ${err.message}`, { type: 'error' });
          }
        },
      },
    });
  } catch (err) {
    toast(`Couldn't delete ${label}: ${err.message}`, { type: 'error' });
  }
}

async function exportPatients(records) {
  toolbar.setExporting(true);
  try {
    const rows = records ?? await patientService.listAll(state.query);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(records?.length === 1 ? `patient-${records[0].id}.csv` : `patients-${stamp}.csv`, patientsToCsv(rows));
    toast(`Exported ${plural(rows.length, 'patient')} to CSV.`, { type: 'success' });
  } catch (err) {
    toast(`Export failed: ${err.message}`, { type: 'error' });
  } finally {
    toolbar.setExporting(false);
    renderAll();
  }
}

/* ---------------------------------------------------------------- sidebar */
const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1199px)');

function syncSidebarToggle() {
  header.setSidebarExpanded(!document.documentElement.classList.contains('sb-collapsed'));
}

function toggleSidebar() {
  const collapsed = document.documentElement.classList.toggle('sb-collapsed');
  try { localStorage.setItem('ac.sidebarCollapsed', collapsed ? '1' : '0'); } catch (_) { /* storage blocked */ }
  syncSidebarToggle();
}

tabletQuery.addEventListener('change', syncSidebarToggle);
syncSidebarToggle();

/* -------------------------------------------------------------- real-time */
patientService.subscribeToStatus((evt) => {
  sidebar.setCount('queue', evt.queueCount);
  const item = state.items.find((p) => p.id === evt.id);
  if (item) item.status = evt.status;
  table.setStatus(evt.id, evt.status, evt.label);
  panel.setStatus(evt.id, evt.status);
});

/* ----------------------------------------------------------- global guards */
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast('Something went wrong. Please try again.', { type: 'error' });
});

load();
