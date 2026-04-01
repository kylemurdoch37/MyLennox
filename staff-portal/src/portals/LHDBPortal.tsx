import React, { useState, useEffect, useMemo } from 'react';
import { pb } from '../pb';
import type { StaffUser, HousingApplication, HousingUnit, ViewingSchedule } from '../types';
import {
  GovButton, GovCard, GovBadge, GovTable, GovModal,
  GovInput, GovSelect, GovTextarea, StatCard, SectionHeader, GovTabs, SearchBar
} from '../components/UI';
import {
  Home, Users, Calendar, BarChart3, AlertCircle, Plus,
  CheckCircle, XCircle, Clock, Eye, Building2, Loader2
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(s: HousingApplication['status']) {
  const map: Record<HousingApplication['status'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
    pending:           { label: 'Pending',    variant: 'warning' },
    approved:          { label: 'Approved',   variant: 'success' },
    rejected:          { label: 'Rejected',   variant: 'danger'  },
    waitlisted:        { label: 'Waitlisted', variant: 'info'    },
    viewing_scheduled: { label: 'Viewing',    variant: 'navy' as 'info' },
  };
  const { label, variant } = map[s] ?? { label: s, variant: 'default' };
  return <GovBadge variant={variant}>{label}</GovBadge>;
}

function unitStatusBadge(s: HousingUnit['status']) {
  const map: Record<HousingUnit['status'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
    available:   { label: 'Available',   variant: 'success' },
    occupied:    { label: 'Occupied',    variant: 'default' },
    maintenance: { label: 'Maintenance', variant: 'warning' },
    reserved:    { label: 'Reserved',    variant: 'info' as 'warning' },
  };
  const { label, variant } = map[s] ?? { label: s, variant: 'default' };
  return <GovBadge variant={variant}>{label}</GovBadge>;
}

function affordabilityRating(income: number, rent: number): { label: string; variant: 'success' | 'warning' | 'danger'; pct: number } {
  const pct = (rent / income) * 100;
  if (pct <= 25) return { label: 'Affordable', variant: 'success', pct };
  if (pct <= 35) return { label: 'Moderate',   variant: 'warning', pct };
  return { label: 'High Burden', variant: 'danger', pct };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n: number) {
  return `L$${n.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Seed helpers (so portal works before PocketBase has real data)
// ---------------------------------------------------------------------------

const SEED_APPLICATIONS: HousingApplication[] = [
  { id: '1', uid: 'u1', applicantName: 'Alice Mercer',   applicantEmail: 'alice@example.com',  applicantPhone: '555-0101', bedrooms: 2, preferredArea: 'North Lennox', monthlyIncome: 3800, householdSize: 3, currentSituation: 'Renting privately', status: 'pending',           createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: '2', uid: 'u2', applicantName: 'Bob Tran',       applicantEmail: 'bob@example.com',    applicantPhone: '555-0102', bedrooms: 1, preferredArea: 'Central',      monthlyIncome: 2100, householdSize: 1, currentSituation: 'Temporary accommodation', status: 'approved',   createdAt: '2026-02-15', updatedAt: '2026-03-10' },
  { id: '3', uid: 'u3', applicantName: 'Carol Singh',    applicantEmail: 'carol@example.com',  applicantPhone: '555-0103', bedrooms: 3, preferredArea: 'South Lennox', monthlyIncome: 4200, householdSize: 5, currentSituation: 'Overcrowded housing', status: 'waitlisted',     createdAt: '2026-01-20', updatedAt: '2026-02-28' },
  { id: '4', uid: 'u4', applicantName: 'David Lee',      applicantEmail: 'david@example.com',  applicantPhone: '555-0104', bedrooms: 2, preferredArea: 'East Lennox',  monthlyIncome: 3100, householdSize: 2, currentSituation: 'Homeless', status: 'viewing_scheduled',         createdAt: '2026-03-05', updatedAt: '2026-03-20' },
  { id: '5', uid: 'u5', applicantName: 'Emma Watkins',   applicantEmail: 'emma@example.com',   applicantPhone: '555-0105', bedrooms: 1, preferredArea: 'Central',      monthlyIncome: 1900, householdSize: 1, currentSituation: 'Domestic violence refuge', status: 'approved',  createdAt: '2026-03-10', updatedAt: '2026-03-15' },
  { id: '6', uid: 'u6', applicantName: 'Frank Obi',      applicantEmail: 'frank@example.com',  applicantPhone: '555-0106', bedrooms: 4, preferredArea: 'North Lennox', monthlyIncome: 5500, householdSize: 6, currentSituation: 'Renting privately', status: 'rejected',          createdAt: '2026-02-01', updatedAt: '2026-02-20' },
];

const SEED_UNITS: HousingUnit[] = [
  { id: 'u1', blockName: 'Harbour View', floor: 3, unitNumber: '3A', bedrooms: 2, bathrooms: 1, sqm: 68,  area: 'Central',      status: 'available',   baseRent: 950,  createdAt: '2025-01-01' },
  { id: 'u2', blockName: 'Harbour View', floor: 5, unitNumber: '5C', bedrooms: 1, bathrooms: 1, sqm: 45,  area: 'Central',      status: 'occupied',    baseRent: 750,  currentTenantId: 'u2', createdAt: '2025-01-01' },
  { id: 'u3', blockName: 'Hillside Mews', floor: 1, unitNumber: '1B', bedrooms: 3, bathrooms: 2, sqm: 95, area: 'South Lennox', status: 'maintenance', baseRent: 1200, createdAt: '2025-01-01' },
  { id: 'u4', blockName: 'North Gardens', floor: 2, unitNumber: '2D', bedrooms: 2, bathrooms: 1, sqm: 72, area: 'North Lennox', status: 'reserved',    baseRent: 980,  createdAt: '2025-01-01' },
  { id: 'u5', blockName: 'Riverside',   floor: 4, unitNumber: '4F', bedrooms: 1, bathrooms: 1, sqm: 48,  area: 'East Lennox',  status: 'available',   baseRent: 700,  createdAt: '2025-01-01' },
  { id: 'u6', blockName: 'Riverside',   floor: 2, unitNumber: '2A', bedrooms: 4, bathrooms: 2, sqm: 130, area: 'North Lennox', status: 'available',   baseRent: 1450, createdAt: '2025-01-01' },
];

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function Overview({ applications, units }: { applications: HousingApplication[]; units: HousingUnit[] }) {
  const pending   = applications.filter(a => a.status === 'pending').length;
  const approved  = applications.filter(a => a.status === 'approved').length;
  const waitlist  = applications.filter(a => a.status === 'waitlisted').length;
  const available = units.filter(u => u.status === 'available').length;

  const recent = [...applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Review"   value={pending}   icon={<Clock className="w-6 h-6" />} variant="warning" />
        <StatCard label="Approved"         value={approved}  icon={<CheckCircle className="w-6 h-6" />} variant="success" />
        <StatCard label="Waitlisted"       value={waitlist}  icon={<Users className="w-6 h-6" />} />
        <StatCard label="Units Available"  value={available} icon={<Home className="w-6 h-6" />} variant={available > 0 ? 'success' : 'danger'} />
      </div>

      <GovCard noPad>
        <div className="px-6 py-4 border-b border-[var(--gov-border)]">
          <h3 className="font-semibold text-sm">Recent Applications</h3>
        </div>
        <GovTable
          columns={[
            { key: 'applicantName', header: 'Applicant' },
            { key: 'bedrooms',      header: 'Beds',    render: r => `${r.bedrooms} bed` },
            { key: 'preferredArea', header: 'Area' },
            { key: 'status',        header: 'Status',  render: r => statusBadge(r.status) },
            { key: 'createdAt',     header: 'Submitted', render: r => fmtDate(r.createdAt) },
          ]}
          data={recent}
        />
      </GovCard>

      {pending > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">{pending} application{pending > 1 ? 's' : ''} awaiting review</p>
            <p className="text-xs text-amber-700 mt-0.5">Review pending applications in the Applications tab.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Applications tab
// ---------------------------------------------------------------------------

function ApplicationsTab({
  applications,
  units,
  onUpdate,
  canApprove,
}: {
  applications: HousingApplication[];
  units: HousingUnit[];
  onUpdate: (id: string, patch: Partial<HousingApplication>) => void;
  canApprove: boolean;
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<HousingApplication | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignUnit, setAssignUnit] = useState('');

  const filtered = useMemo(() => {
    return applications.filter(a => {
      const matchSearch = a.applicantName.toLowerCase().includes(search.toLowerCase()) ||
        a.applicantEmail.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [applications, search, filterStatus]);

  const availableUnits = units.filter(u => u.status === 'available' &&
    (!selected || u.bedrooms >= selected.bedrooms));

  async function doAction(id: string, status: HousingApplication['status']) {
    setActionLoading(true);
    try {
      await pb.collection('housing_applications').update(id, { status }).catch(() => {});
      onUpdate(id, { status });
      setSelected(null);
    } finally {
      setActionLoading(false);
    }
  }

  const aff = selected ? affordabilityRating(selected.monthlyIncome, availableUnits.find(u => u.id === assignUnit)?.baseRent ?? 0) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search applicants…" className="flex-1" />
        <GovSelect
          options={[
            { value: 'all',               label: 'All Statuses' },
            { value: 'pending',           label: 'Pending' },
            { value: 'approved',          label: 'Approved' },
            { value: 'waitlisted',        label: 'Waitlisted' },
            { value: 'viewing_scheduled', label: 'Viewing Scheduled' },
            { value: 'rejected',          label: 'Rejected' },
          ]}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="sm:w-48"
        />
      </div>

      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'applicantName',  header: 'Applicant' },
            { key: 'bedrooms',       header: 'Beds',   render: r => `${r.bedrooms} bed` },
            { key: 'householdSize',  header: 'HH Size' },
            { key: 'preferredArea',  header: 'Area' },
            { key: 'monthlyIncome',  header: 'Income',  render: r => fmtCurrency(r.monthlyIncome) },
            { key: 'status',         header: 'Status',  render: r => statusBadge(r.status) },
            { key: 'createdAt',      header: 'Date',    render: r => fmtDate(r.createdAt) },
          ]}
          data={filtered}
          onRowClick={row => setSelected(row)}
          emptyMessage="No applications match your filters."
        />
      </GovCard>

      {/* Detail modal */}
      <GovModal
        open={!!selected}
        onClose={() => { setSelected(null); setAssignUnit(''); }}
        title="Application Details"
        width="lg"
        footer={
          canApprove && selected ? (
            <>
              {selected.status === 'pending' && (
                <>
                  <GovButton variant="secondary" size="sm" disabled={actionLoading}
                    onClick={() => doAction(selected.id, 'waitlisted')}>
                    Waitlist
                  </GovButton>
                  <GovButton variant="danger" size="sm" disabled={actionLoading}
                    onClick={() => doAction(selected.id, 'rejected')}>
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </GovButton>
                  <GovButton size="sm" disabled={actionLoading || !assignUnit}
                    onClick={() => doAction(selected.id, 'approved')}>
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Approve & Assign
                  </GovButton>
                </>
              )}
              {selected.status === 'waitlisted' && (
                <GovButton size="sm" disabled={actionLoading}
                  onClick={() => doAction(selected.id, 'pending')}>
                  Move to Pending
                </GovButton>
              )}
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[var(--gov-muted)] text-xs">Name</p><p className="font-medium">{selected.applicantName}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Email</p><p className="font-medium">{selected.applicantEmail}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Phone</p><p className="font-medium">{selected.applicantPhone ?? '—'}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Status</p>{statusBadge(selected.status)}</div>
              <div><p className="text-[var(--gov-muted)] text-xs">Bedrooms Needed</p><p className="font-medium">{selected.bedrooms}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Household Size</p><p className="font-medium">{selected.householdSize}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Preferred Area</p><p className="font-medium">{selected.preferredArea}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Monthly Income</p><p className="font-medium">{fmtCurrency(selected.monthlyIncome)}</p></div>
            </div>
            <div>
              <p className="text-[var(--gov-muted)] text-xs mb-1">Current Situation</p>
              <p className="text-sm bg-gray-50 rounded-lg p-3">{selected.currentSituation}</p>
            </div>
            {selected.notes && (
              <div>
                <p className="text-[var(--gov-muted)] text-xs mb-1">Notes</p>
                <p className="text-sm bg-gray-50 rounded-lg p-3">{selected.notes}</p>
              </div>
            )}

            {/* Affordability Indexing Tool */}
            {canApprove && selected.status === 'pending' && (
              <div className="border border-[var(--gov-border)] rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold">Affordability Indexing</p>
                <GovSelect
                  label="Assign Available Unit"
                  options={[
                    { value: '', label: 'Select a unit…' },
                    ...availableUnits.map(u => ({
                      value: u.id,
                      label: `${u.blockName} ${u.unitNumber} — ${u.bedrooms}bed, ${fmtCurrency(u.baseRent)}/mo`,
                    })),
                  ]}
                  value={assignUnit}
                  onChange={e => setAssignUnit(e.target.value)}
                />
                {assignUnit && aff && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg
                    ${aff.variant === 'success' ? 'bg-green-50 border border-green-200' :
                      aff.variant === 'warning' ? 'bg-amber-50 border border-amber-200' :
                      'bg-red-50 border border-red-200'}`}>
                    <div className="flex-1">
                      <p className="text-xs font-medium">Rent-to-income ratio: <span className="font-bold">{aff.pct.toFixed(1)}%</span></p>
                      <div className="mt-1.5 h-2 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${aff.variant === 'success' ? 'bg-green-500' : aff.variant === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(aff.pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <GovBadge variant={aff.variant}>{aff.label}</GovBadge>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </GovModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Housing Stock tab
// ---------------------------------------------------------------------------

function StockTab({ units }: { units: HousingUnit[] }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = useMemo(() =>
    units.filter(u => {
      const matchSearch = u.blockName.toLowerCase().includes(search.toLowerCase()) ||
        u.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
        u.area.toLowerCase().includes(search.toLowerCase());
      return matchSearch && (filterStatus === 'all' || u.status === filterStatus);
    }),
    [units, search, filterStatus]
  );

  const byStatus = {
    available:   units.filter(u => u.status === 'available').length,
    occupied:    units.filter(u => u.status === 'occupied').length,
    maintenance: units.filter(u => u.status === 'maintenance').length,
    reserved:    units.filter(u => u.status === 'reserved').length,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Available"   value={byStatus.available}   variant="success" />
        <StatCard label="Occupied"    value={byStatus.occupied}    variant="default" />
        <StatCard label="Maintenance" value={byStatus.maintenance} variant="warning" />
        <StatCard label="Reserved"    value={byStatus.reserved}    />
      </div>

      <div className="flex gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search units…" className="flex-1" />
        <GovSelect
          options={[
            { value: 'all',         label: 'All Statuses' },
            { value: 'available',   label: 'Available' },
            { value: 'occupied',    label: 'Occupied' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'reserved',    label: 'Reserved' },
          ]}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="w-44"
        />
      </div>

      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'blockName',  header: 'Block' },
            { key: 'unitNumber', header: 'Unit' },
            { key: 'area',       header: 'Area' },
            { key: 'bedrooms',   header: 'Beds',    render: r => `${r.bedrooms}B/${r.bathrooms}Ba` },
            { key: 'sqm',        header: 'Size',    render: r => `${r.sqm} m²` },
            { key: 'baseRent',   header: 'Rent/mo', render: r => fmtCurrency(r.baseRent) },
            { key: 'status',     header: 'Status',  render: r => unitStatusBadge(r.status) },
          ]}
          data={filtered}
          emptyMessage="No units match your search."
        />
      </GovCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Viewings tab (stub scheduler)
// ---------------------------------------------------------------------------

function ViewingsTab({
  applications,
  units,
  staff,
}: {
  applications: HousingApplication[];
  units: HousingUnit[];
  staff: StaffUser;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ applicationId: '', unitId: '', scheduledAt: '', notes: '' });
  const [viewings, setViewings] = useState<ViewingSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    pb.collection('viewing_schedules').getList(1, 50, { sort: '-scheduledAt' })
      .then(res => setViewings(res.items as unknown as ViewingSchedule[]))
      .catch(() => setViewings([]));
  }, []);

  async function schedule() {
    setLoading(true);
    try {
      const rec = await pb.collection('viewing_schedules').create({
        ...form,
        staffId: staff.id,
        status: 'scheduled',
      }).catch(() => null);
      if (rec) {
        setViewings(v => [rec as unknown as ViewingSchedule, ...v]);
        // Update application status
        await pb.collection('housing_applications').update(form.applicationId, { status: 'viewing_scheduled' }).catch(() => {});
      }
      setOpen(false);
      setForm({ applicationId: '', unitId: '', scheduledAt: '', notes: '' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Viewing Schedule"
        sub="Manage property viewing appointments"
        action={
          <GovButton size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Schedule Viewing
          </GovButton>
        }
      />

      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'applicationId', header: 'Applicant',   render: r => applications.find(a => a.id === r.applicationId)?.applicantName ?? r.applicationId },
            { key: 'unitId',        header: 'Unit',        render: r => { const u = units.find(x => x.id === r.unitId); return u ? `${u.blockName} ${u.unitNumber}` : r.unitId; } },
            { key: 'scheduledAt',   header: 'Scheduled',   render: r => fmtDate(r.scheduledAt) },
            { key: 'status',        header: 'Status',      render: r => <GovBadge variant={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'info'}>{r.status}</GovBadge> },
          ]}
          data={viewings}
          emptyMessage="No viewings scheduled."
        />
      </GovCard>

      <GovModal
        open={open}
        onClose={() => setOpen(false)}
        title="Schedule Viewing"
        footer={
          <>
            <GovButton variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</GovButton>
            <GovButton size="sm" disabled={loading || !form.applicationId || !form.unitId || !form.scheduledAt} onClick={schedule}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
              Schedule
            </GovButton>
          </>
        }
      >
        <div className="space-y-4">
          <GovSelect
            label="Application"
            options={[
              { value: '', label: 'Select applicant…' },
              ...applications.filter(a => ['pending', 'approved', 'waitlisted'].includes(a.status)).map(a => ({
                value: a.id,
                label: `${a.applicantName} — ${a.bedrooms}bed`,
              })),
            ]}
            value={form.applicationId}
            onChange={e => setForm(f => ({ ...f, applicationId: e.target.value }))}
          />
          <GovSelect
            label="Unit"
            options={[
              { value: '', label: 'Select unit…' },
              ...units.filter(u => u.status === 'available').map(u => ({
                value: u.id,
                label: `${u.blockName} ${u.unitNumber} — ${u.bedrooms}bed`,
              })),
            ]}
            value={form.unitId}
            onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}
          />
          <GovInput
            label="Date & Time"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
          />
          <GovTextarea
            label="Notes (optional)"
            rows={3}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </GovModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main portal
// ---------------------------------------------------------------------------

export default function LHDBPortal({ staff }: { staff: StaffUser }) {
  const [tab, setTab] = useState('overview');
  const [applications, setApplications] = useState<HousingApplication[]>(SEED_APPLICATIONS);
  const [units, setUnits] = useState<HousingUnit[]>(SEED_UNITS);

  useEffect(() => {
    pb.collection('housing_applications').getList(1, 200, { sort: '-createdAt' })
      .then(res => { if (res.items.length) setApplications(res.items as unknown as HousingApplication[]); })
      .catch(() => {});
    pb.collection('housing_units').getList(1, 200, { sort: 'blockName,unitNumber' })
      .then(res => { if (res.items.length) setUnits(res.items as unknown as HousingUnit[]); })
      .catch(() => {});
  }, []);

  function patchApplication(id: string, patch: Partial<HousingApplication>) {
    setApplications(apps => apps.map(a => a.id === id ? { ...a, ...patch } : a));
  }

  const canApprove = staff.role === 'manager' || staff.role === 'admin';

  const tabs = [
    { id: 'overview',      label: 'Overview',         icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'applications',  label: 'Applications',     icon: <Users className="w-4 h-4" /> },
    { id: 'stock',         label: 'Housing Stock',    icon: <Building2 className="w-4 h-4" /> },
    { id: 'viewings',      label: 'Viewings',         icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[var(--gov-bg)] p-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Lennox Housing Development Board"
          sub="Application management, housing stock, and affordability assessment"
        />

        <GovTabs tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'overview'     && <Overview applications={applications} units={units} />}
        {tab === 'applications' && <ApplicationsTab applications={applications} units={units} onUpdate={patchApplication} canApprove={canApprove} />}
        {tab === 'stock'        && <StockTab units={units} />}
        {tab === 'viewings'     && <ViewingsTab applications={applications} units={units} staff={staff} />}
      </div>
    </div>
  );
}
