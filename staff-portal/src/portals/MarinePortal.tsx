import React, { useState, useEffect, useMemo } from 'react';
import { pb } from '../pb';
import type { StaffUser, MarineVessel, MarineLicense, MarineSchedule } from '../types';
import {
  GovButton, GovCard, GovBadge, GovTable, GovModal,
  GovInput, GovSelect, GovTextarea, StatCard, SectionHeader, GovTabs, SearchBar
} from '../components/UI';
import { Anchor, Ship, FileText, Calendar, Plus, Loader2, AlertCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function vesselStatusBadge(s: MarineVessel['status']) {
  const map: Record<MarineVessel['status'], { label: string; variant: 'success' | 'info' | 'warning' | 'danger' }> = {
    active:         { label: 'Active',         variant: 'success' },
    docked:         { label: 'Docked',         variant: 'info'    },
    maintenance:    { label: 'Maintenance',    variant: 'warning' },
    decommissioned: { label: 'Decommissioned', variant: 'danger'  },
  };
  const { label, variant } = map[s] ?? { label: s, variant: 'info' };
  return <GovBadge variant={variant}>{label}</GovBadge>;
}

function licenseStatusBadge(s: MarineLicense['status']) {
  const map: Record<MarineLicense['status'], 'success' | 'danger' | 'warning' | 'info'> = {
    active: 'success', expired: 'danger', suspended: 'warning', pending: 'info',
  };
  return <GovBadge variant={map[s] ?? 'default'}>{s}</GovBadge>;
}

function scheduleBadge(s: MarineSchedule['status']) {
  const map: Record<MarineSchedule['status'], 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
    scheduled: 'info', departed: 'success', arrived: 'success', delayed: 'warning', cancelled: 'danger',
  };
  return <GovBadge variant={map[s] ?? 'default'}>{s}</GovBadge>;
}

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_VESSELS: MarineVessel[] = [
  { id: 'v1', name: 'LMV Endeavour',  registration: 'LM-001', type: 'patrol',  status: 'active',      currentPort: 'Lennox Main Wharf',  captain: 'Capt. J. Hargreaves', crewCount: 12, lastInspection: '2026-01-15' },
  { id: 'v2', name: 'LMV Coastal Run',registration: 'LM-002', type: 'ferry',   status: 'active',      currentPort: 'North Pier',         nextPort: 'South Cove', nextDeparture: '2026-04-02T09:00', captain: 'Capt. M. Tanaka',     crewCount: 8,  lastInspection: '2026-02-20' },
  { id: 'v3', name: 'LMV Surveyor',   registration: 'LM-003', type: 'research',status: 'docked',      currentPort: 'Research Dock 3',    captain: 'Capt. A. Okonkwo',    crewCount: 15, lastInspection: '2025-11-10' },
  { id: 'v4', name: 'LMV Workboat 4', registration: 'LM-004', type: 'maintenance',status: 'maintenance',currentPort: 'Dry Dock 1',        captain: 'Capt. S. Williams',   crewCount: 6,  lastInspection: '2025-09-05' },
  { id: 'v5', name: 'LMV Freighter A',registration: 'LM-005', type: 'cargo',   status: 'active',      currentPort: 'Cargo Terminal B',   captain: 'Capt. P. Dlamini',    crewCount: 22, lastInspection: '2026-03-01' },
];

const SEED_LICENSES: MarineLicense[] = [
  { id: 'l1', applicantName: 'Thomas Reed',    applicantId: 'c1', licenseType: 'recreational', issueDate: '2024-06-01', expiryDate: '2026-06-01', status: 'active',    vessel: 'Sea Breeze' },
  { id: 'l2', applicantName: 'Maria Santos',   applicantId: 'c2', licenseType: 'commercial',   issueDate: '2023-03-15', expiryDate: '2025-03-15', status: 'expired',   vessel: 'Santos Trader' },
  { id: 'l3', applicantName: 'James Okafor',   applicantId: 'c3', licenseType: 'professional', issueDate: '2025-01-10', expiryDate: '2028-01-10', status: 'active' },
  { id: 'l4', applicantName: 'Nina Petrov',    applicantId: 'c4', licenseType: 'fishing',      issueDate: '2025-08-22', expiryDate: '2026-08-22', status: 'pending' },
  { id: 'l5', applicantName: 'Derek Lau',      applicantId: 'c5', licenseType: 'recreational', issueDate: '2022-05-05', expiryDate: '2024-05-05', status: 'suspended' },
];

const SEED_SCHEDULES: MarineSchedule[] = [
  { id: 's1', vesselId: 'v2', vesselName: 'LMV Coastal Run', origin: 'North Pier',         destination: 'South Cove',     departureTime: '2026-04-02T09:00', arrivalTime: '2026-04-02T11:30', passengerCount: 84, status: 'scheduled' },
  { id: 's2', vesselId: 'v5', vesselName: 'LMV Freighter A', origin: 'Cargo Terminal B',   destination: 'Port Galveston', departureTime: '2026-04-01T06:00', arrivalTime: '2026-04-03T08:00', cargoType: 'General goods', status: 'departed' },
  { id: 's3', vesselId: 'v1', vesselName: 'LMV Endeavour',   origin: 'Lennox Main Wharf',  destination: 'East Sea Zone',  departureTime: '2026-04-01T14:00', arrivalTime: '2026-04-01T18:00', status: 'arrived' },
  { id: 's4', vesselId: 'v2', vesselName: 'LMV Coastal Run', origin: 'South Cove',         destination: 'North Pier',     departureTime: '2026-04-02T14:00', arrivalTime: '2026-04-02T16:30', passengerCount: 65, status: 'delayed' },
];

// ---------------------------------------------------------------------------
// Fleet tab
// ---------------------------------------------------------------------------

function FleetTab({ vessels }: { vessels: MarineVessel[] }) {
  const [selected, setSelected] = useState<MarineVessel | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    vessels.filter(v =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.registration.toLowerCase().includes(search.toLowerCase()) ||
      v.currentPort.toLowerCase().includes(search.toLowerCase())
    ), [vessels, search]
  );

  const active = vessels.filter(v => v.status === 'active').length;
  const maint  = vessels.filter(v => v.status === 'maintenance').length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Fleet"   value={vessels.length}   icon={<Ship className="w-6 h-6" />} />
        <StatCard label="Active"        value={active}           variant="success" />
        <StatCard label="Maintenance"   value={maint}            variant={maint > 0 ? 'warning' : 'default'} />
        <StatCard label="Docked"        value={vessels.filter(v => v.status === 'docked').length} />
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search vessels…" className="max-w-sm" />

      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'name',           header: 'Vessel' },
            { key: 'registration',   header: 'Reg.' },
            { key: 'type',           header: 'Type',    render: r => <GovBadge>{r.type}</GovBadge> },
            { key: 'status',         header: 'Status',  render: r => vesselStatusBadge(r.status) },
            { key: 'currentPort',    header: 'Port' },
            { key: 'captain',        header: 'Captain' },
            { key: 'crewCount',      header: 'Crew' },
            { key: 'lastInspection', header: 'Last Inspection', render: r => fmtDate(r.lastInspection ?? '') },
          ]}
          data={filtered}
          onRowClick={setSelected}
        />
      </GovCard>

      <GovModal open={!!selected} onClose={() => setSelected(null)} title="Vessel Details">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[var(--gov-muted)] text-xs">Name</p><p className="font-semibold">{selected.name}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Registration</p><p className="font-medium">{selected.registration}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Type</p><GovBadge>{selected.type}</GovBadge></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Status</p>{vesselStatusBadge(selected.status)}</div>
              <div><p className="text-[var(--gov-muted)] text-xs">Captain</p><p className="font-medium">{selected.captain}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Crew</p><p className="font-medium">{selected.crewCount}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Current Port</p><p className="font-medium">{selected.currentPort}</p></div>
              {selected.nextPort && <div><p className="text-[var(--gov-muted)] text-xs">Next Port</p><p className="font-medium">{selected.nextPort}</p></div>}
              {selected.nextDeparture && <div><p className="text-[var(--gov-muted)] text-xs">Next Departure</p><p className="font-medium">{fmtDate(selected.nextDeparture)}</p></div>}
              <div><p className="text-[var(--gov-muted)] text-xs">Last Inspection</p><p className="font-medium">{fmtDate(selected.lastInspection ?? '')}</p></div>
            </div>
            {selected.notes && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-[var(--gov-muted)] mb-1">Notes</p><p>{selected.notes}</p></div>}
          </div>
        )}
      </GovModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Licenses tab
// ---------------------------------------------------------------------------

function LicensesTab({ licenses, canApprove }: { licenses: MarineLicense[]; canApprove: boolean }) {
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilter]   = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [newOpen, setNewOpen]       = useState(false);
  const [form, setForm] = useState({ applicantName: '', applicantId: '', licenseType: 'recreational', expiryDate: '', vessel: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [localLicenses, setLocalLicenses] = useState(licenses);

  useEffect(() => { setLocalLicenses(licenses); }, [licenses]);

  const filtered = useMemo(() =>
    localLicenses.filter(l => {
      const q = search.toLowerCase();
      const matchSearch = l.applicantName.toLowerCase().includes(q) || l.applicantId.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || l.status === filterStatus;
      const matchType   = filterType   === 'all' || l.licenseType === filterType;
      return matchSearch && matchStatus && matchType;
    }), [localLicenses, search, filterStatus, filterType]
  );

  const expiringSoon = localLicenses.filter(l => {
    if (l.status !== 'active') return false;
    const diff = new Date(l.expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  });

  async function create() {
    setSaving(true);
    try {
      const rec = await pb.collection('marine_licenses').create({
        ...form,
        issueDate: new Date().toISOString().slice(0, 10),
        status: 'pending',
      }).catch(() => null);
      const newLic: MarineLicense = rec ? rec as unknown as MarineLicense : {
        id: `local-${Date.now()}`,
        ...form,
        licenseType: form.licenseType as MarineLicense['licenseType'],
        issueDate: new Date().toISOString().slice(0, 10),
        expiryDate: form.expiryDate,
        status: 'pending',
      };
      setLocalLicenses(l => [newLic, ...l]);
      setNewOpen(false);
      setForm({ applicantName: '', applicantId: '', licenseType: 'recreational', expiryDate: '', vessel: '', notes: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800"><strong>{expiringSoon.length}</strong> license{expiringSoon.length > 1 ? 's' : ''} expiring within 30 days</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search applicants…" className="flex-1" />
        <GovSelect options={[{ value: 'all', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'expired', label: 'Expired' }, { value: 'suspended', label: 'Suspended' }, { value: 'pending', label: 'Pending' }]}
          value={filterStatus} onChange={e => setFilter(e.target.value)} className="sm:w-40" />
        <GovSelect options={[{ value: 'all', label: 'All Types' }, { value: 'recreational', label: 'Recreational' }, { value: 'commercial', label: 'Commercial' }, { value: 'professional', label: 'Professional' }, { value: 'fishing', label: 'Fishing' }]}
          value={filterType} onChange={e => setFilterType(e.target.value)} className="sm:w-40" />
        {canApprove && (
          <GovButton size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4" /> New License
          </GovButton>
        )}
      </div>

      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'applicantName', header: 'Name' },
            { key: 'licenseType',   header: 'Type',    render: r => <GovBadge>{r.licenseType}</GovBadge> },
            { key: 'issueDate',     header: 'Issued',  render: r => fmtDate(r.issueDate) },
            { key: 'expiryDate',    header: 'Expires', render: r => fmtDate(r.expiryDate) },
            { key: 'vessel',        header: 'Vessel',  render: r => r.vessel ?? '—' },
            { key: 'status',        header: 'Status',  render: r => licenseStatusBadge(r.status) },
          ]}
          data={filtered}
        />
      </GovCard>

      <GovModal open={newOpen} onClose={() => setNewOpen(false)} title="Issue New License"
        footer={<>
          <GovButton variant="secondary" size="sm" onClick={() => setNewOpen(false)}>Cancel</GovButton>
          <GovButton size="sm" disabled={saving || !form.applicantName || !form.expiryDate} onClick={create}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Issue
          </GovButton>
        </>}
      >
        <div className="space-y-4">
          <GovInput label="Applicant Name"  value={form.applicantName}  onChange={e => setForm(f => ({ ...f, applicantName: e.target.value }))} />
          <GovInput label="Citizen ID / UID" value={form.applicantId}   onChange={e => setForm(f => ({ ...f, applicantId: e.target.value }))} />
          <GovSelect label="License Type"
            options={[{ value: 'recreational', label: 'Recreational' }, { value: 'commercial', label: 'Commercial' }, { value: 'professional', label: 'Professional' }, { value: 'fishing', label: 'Fishing' }]}
            value={form.licenseType} onChange={e => setForm(f => ({ ...f, licenseType: e.target.value }))} />
          <GovInput label="Expiry Date" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
          <GovInput label="Vessel (optional)" value={form.vessel} onChange={e => setForm(f => ({ ...f, vessel: e.target.value }))} />
        </div>
      </GovModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedules tab
// ---------------------------------------------------------------------------

function SchedulesTab({ schedules, vessels }: { schedules: MarineSchedule[]; vessels: MarineVessel[] }) {
  const [filter, setFilter] = useState('all');

  const filtered = schedules.filter(s => filter === 'all' || s.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <GovSelect
          options={[{ value: 'all', label: 'All' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'departed', label: 'Departed' }, { value: 'arrived', label: 'Arrived' }, { value: 'delayed', label: 'Delayed' }, { value: 'cancelled', label: 'Cancelled' }]}
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-44"
        />
      </div>
      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'vesselName',    header: 'Vessel' },
            { key: 'origin',        header: 'From' },
            { key: 'destination',   header: 'To' },
            { key: 'departureTime', header: 'Departure', render: r => fmtDate(r.departureTime) },
            { key: 'arrivalTime',   header: 'Arrival',   render: r => fmtDate(r.arrivalTime) },
            { key: 'cargoType',     header: 'Cargo/Pax', render: r => r.cargoType ?? (r.passengerCount ? `${r.passengerCount} pax` : '—') },
            { key: 'status',        header: 'Status',    render: r => scheduleBadge(r.status) },
          ]}
          data={filtered}
          emptyMessage="No schedules match filter."
        />
      </GovCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main portal
// ---------------------------------------------------------------------------

export default function MarinePortal({ staff }: { staff: StaffUser }) {
  const [tab, setTab] = useState('fleet');
  const [vessels, setVessels]     = useState<MarineVessel[]>(SEED_VESSELS);
  const [licenses, setLicenses]   = useState<MarineLicense[]>(SEED_LICENSES);
  const [schedules, setSchedules] = useState<MarineSchedule[]>(SEED_SCHEDULES);

  useEffect(() => {
    pb.collection('marine_vessels').getList(1, 100).then(r => { if (r.items.length) setVessels(r.items as unknown as MarineVessel[]); }).catch(() => {});
    pb.collection('marine_licenses').getList(1, 200).then(r => { if (r.items.length) setLicenses(r.items as unknown as MarineLicense[]); }).catch(() => {});
    pb.collection('marine_schedules').getList(1, 100, { sort: '-departureTime' }).then(r => { if (r.items.length) setSchedules(r.items as unknown as MarineSchedule[]); }).catch(() => {});
  }, []);

  const canApprove = staff.role === 'manager' || staff.role === 'admin';

  const tabs = [
    { id: 'fleet',     label: 'Fleet',     icon: <Ship className="w-4 h-4" /> },
    { id: 'schedules', label: 'Schedules', icon: <Calendar className="w-4 h-4" /> },
    { id: 'licenses',  label: 'Licenses',  icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[var(--gov-bg)] p-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Lennox Marine"
          sub="Fleet management, port schedules, and marine licensing"
          action={<Anchor className="w-6 h-6 text-[var(--gov-muted)]" />}
        />

        <GovTabs tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'fleet'     && <FleetTab vessels={vessels} />}
        {tab === 'schedules' && <SchedulesTab schedules={schedules} vessels={vessels} />}
        {tab === 'licenses'  && <LicensesTab licenses={licenses} canApprove={canApprove} />}
      </div>
    </div>
  );
}
