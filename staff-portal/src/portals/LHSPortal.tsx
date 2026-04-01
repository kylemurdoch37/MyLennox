import React, { useState, useEffect, useMemo } from 'react';
import { pb } from '../pb';
import type { StaffUser, HealthResource, HealthBulletin } from '../types';
import {
  GovButton, GovCard, GovBadge, GovTable, GovModal,
  GovInput, GovSelect, GovTextarea, StatCard, SectionHeader, GovTabs, SearchBar
} from '../components/UI';
import { Activity, Bell, Plus, Loader2, AlertCircle, AlertTriangle, Info, BellRing, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityConfig(s: HealthBulletin['severity']) {
  const map = {
    info:     { label: 'Info',     variant: 'info'    as const, Icon: Info,          bg: 'bg-blue-50  border-blue-200',  text: 'text-blue-800'  },
    advisory: { label: 'Advisory', variant: 'default' as const, Icon: Bell,          bg: 'bg-gray-50  border-gray-200',  text: 'text-gray-800'  },
    warning:  { label: 'Warning',  variant: 'warning' as const, Icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
    critical: { label: 'Critical', variant: 'danger'  as const, Icon: BellRing,      bg: 'bg-red-50   border-red-200',   text: 'text-red-800'   },
  };
  return map[s] ?? map.info;
}

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function resourceTypeBadge(t: HealthResource['resourceType']) {
  const labels: Record<HealthResource['resourceType'], string> = {
    bed: 'Bed', icu_bed: 'ICU Bed', ventilator: 'Ventilator', staff: 'Staff', supply: 'Supply',
  };
  return <GovBadge>{labels[t] ?? t}</GovBadge>;
}

function availabilityVariant(resource: HealthResource): 'success' | 'warning' | 'danger' {
  const pct = resource.available / resource.total;
  const atAlert = resource.alertThreshold !== undefined && resource.available <= resource.alertThreshold;
  if (atAlert || pct < 0.1) return 'danger';
  if (pct < 0.3) return 'warning';
  return 'success';
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_RESOURCES: HealthResource[] = [
  { id: 'hr1', facilityName: 'Lennox General Hospital', resourceType: 'bed',        label: 'General Beds',      available: 34,  total: 120, unit: 'beds',        updatedAt: '2026-04-01T07:00', alertThreshold: 20 },
  { id: 'hr2', facilityName: 'Lennox General Hospital', resourceType: 'icu_bed',    label: 'ICU Beds',          available: 4,   total: 20,  unit: 'beds',        updatedAt: '2026-04-01T07:00', alertThreshold: 5  },
  { id: 'hr3', facilityName: 'Lennox General Hospital', resourceType: 'ventilator', label: 'Ventilators',       available: 8,   total: 15,  unit: 'units',       updatedAt: '2026-04-01T07:00', alertThreshold: 3  },
  { id: 'hr4', facilityName: 'North Lennox Clinic',     resourceType: 'bed',        label: 'General Beds',      available: 12,  total: 30,  unit: 'beds',        updatedAt: '2026-04-01T08:00', alertThreshold: 5  },
  { id: 'hr5', facilityName: 'North Lennox Clinic',     resourceType: 'staff',      label: 'On-Duty Nurses',    available: 7,   total: 12,  unit: 'staff',       updatedAt: '2026-04-01T08:00', alertThreshold: 4  },
  { id: 'hr6', facilityName: 'South Lennox Health Hub', resourceType: 'supply',     label: 'PPE Kits',          available: 240, total: 500, unit: 'kits',        updatedAt: '2026-04-01T06:30', alertThreshold: 100 },
  { id: 'hr7', facilityName: 'South Lennox Health Hub', resourceType: 'bed',        label: 'General Beds',      available: 2,   total: 20,  unit: 'beds',        updatedAt: '2026-04-01T08:30', alertThreshold: 3  },
  { id: 'hr8', facilityName: 'Lennox General Hospital', resourceType: 'staff',      label: 'On-Duty Doctors',   available: 12,  total: 18,  unit: 'staff',       updatedAt: '2026-04-01T07:00', alertThreshold: 6  },
];

const SEED_BULLETINS: HealthBulletin[] = [
  {
    id: 'b1',
    title: 'Influenza Surge — All Facilities on Advisory',
    content: 'A significant increase in influenza presentations has been recorded across all Lennox Health facilities over the past 72 hours. All facilities should activate surge protocols. Additional PPE has been dispatched to North and South hubs.',
    severity: 'warning',
    agencies: ['lhs', 'admin'],
    publishedBy: 'Dr. E. Osei, Chief Medical Officer',
    publishedAt: '2026-04-01T06:00',
    pinned: true,
  },
  {
    id: 'b2',
    title: 'Scheduled System Downtime — Patient Records 03 Apr',
    content: 'The electronic patient records system will be unavailable for scheduled maintenance on 03 April 2026 between 02:00–04:00. Please ensure critical patient information is documented in paper backup forms prior to this window.',
    severity: 'advisory',
    agencies: ['lhs'],
    publishedBy: 'ICT Health Division',
    publishedAt: '2026-03-28T12:00',
    pinned: false,
  },
  {
    id: 'b3',
    title: 'Critical: ICU Capacity at Lennox General',
    content: 'ICU occupancy at Lennox General Hospital has reached 80%. All non-emergency transfers to LGH should be deferred where clinically safe. Coordinate with South Lennox Health Hub for overflow capacity.',
    severity: 'critical',
    agencies: ['lhs', 'admin'],
    publishedBy: 'Hospital Operations Centre',
    publishedAt: '2026-04-01T05:30',
    pinned: true,
  },
  {
    id: 'b4',
    title: 'Updated Vaccination Schedule — Q2 2026',
    content: 'Updated vaccination schedules for Q2 2026 have been distributed to all facility managers. Community outreach clinics are scheduled for North Lennox (12 Apr) and East Lennox (19 Apr).',
    severity: 'info',
    agencies: ['lhs', 'lhdb', 'metro', 'marine', 'admin'],
    publishedBy: 'Public Health Directorate',
    publishedAt: '2026-03-25T10:00',
    pinned: false,
  },
];

// ---------------------------------------------------------------------------
// Dashboard tab
// ---------------------------------------------------------------------------

function Dashboard({ resources }: { resources: HealthResource[] }) {
  const critical = resources.filter(r => availabilityVariant(r) === 'danger').length;
  const warning  = resources.filter(r => availabilityVariant(r) === 'warning').length;
  const beds     = resources.filter(r => r.resourceType === 'bed' || r.resourceType === 'icu_bed');
  const totalAvailBeds = beds.reduce((s, r) => s + r.available, 0);
  const totalBeds      = beds.reduce((s, r) => s + r.total, 0);

  const facilities = Array.from(new Set(resources.map(r => r.facilityName)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Available Beds"    value={`${totalAvailBeds}/${totalBeds}`} icon={<Activity className="w-6 h-6" />} variant={totalAvailBeds / totalBeds < 0.2 ? 'danger' : 'success'} />
        <StatCard label="Critical Alerts"   value={critical}  variant={critical > 0 ? 'danger' : 'success'} />
        <StatCard label="Warnings"          value={warning}   variant={warning > 0 ? 'warning' : 'success'} />
        <StatCard label="Facilities"        value={facilities.length} />
      </div>

      {critical > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-800">{critical} resource{critical > 1 ? 's' : ''} at or below alert threshold</p>
        </div>
      )}

      {facilities.map(facility => {
        const facilityResources = resources.filter(r => r.facilityName === facility);
        return (
          <GovCard key={facility} noPad>
            <div className="px-6 py-4 border-b border-[var(--gov-border)]">
              <h3 className="font-semibold text-sm">{facility}</h3>
            </div>
            <div className="divide-y divide-[var(--gov-border)]">
              {facilityResources.map(r => {
                const pct = (r.available / r.total) * 100;
                const variant = availabilityVariant(r);
                const barColor = variant === 'success' ? 'bg-green-500' : variant === 'warning' ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div key={r.id} className="px-6 py-3 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {resourceTypeBadge(r.resourceType)}
                        <span className="text-sm font-medium">{r.label}</span>
                        {r.alertThreshold !== undefined && r.available <= r.alertThreshold && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-semibold tabular-nums w-20 text-right">
                          {r.available}/{r.total} {r.unit}
                        </span>
                      </div>
                    </div>
                    <GovBadge variant={variant}>{pct.toFixed(0)}%</GovBadge>
                  </div>
                );
              })}
            </div>
          </GovCard>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resources tab (editable)
// ---------------------------------------------------------------------------

function ResourcesTab({
  resources,
  onUpdate,
  canEdit,
}: {
  resources: HealthResource[];
  onUpdate: (id: string, patch: Partial<HealthResource>) => void;
  canEdit: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HealthResource | null>(null);
  const [form, setForm] = useState({ available: 0, total: 0, alertThreshold: 0 });
  const [saving, setSaving] = useState(false);

  function openEdit(r: HealthResource) {
    setEditTarget(r);
    setForm({ available: r.available, total: r.total, alertThreshold: r.alertThreshold ?? 0 });
    setEditOpen(true);
  }

  async function save() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await pb.collection('health_resources').update(editTarget.id, form).catch(() => {});
      onUpdate(editTarget.id, { ...form, updatedAt: new Date().toISOString() });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'facilityName',  header: 'Facility' },
            { key: 'resourceType',  header: 'Type',      render: r => resourceTypeBadge(r.resourceType) },
            { key: 'label',         header: 'Resource' },
            { key: 'available',     header: 'Available', render: r => <span className={`font-semibold ${availabilityVariant(r) === 'danger' ? 'text-red-600' : availabilityVariant(r) === 'warning' ? 'text-amber-700' : 'text-green-700'}`}>{r.available}</span> },
            { key: 'total',         header: 'Total' },
            { key: 'unit',          header: 'Unit' },
            { key: 'updatedAt',     header: 'Updated',   render: r => fmtDate(r.updatedAt) },
            ...(canEdit ? [{ key: 'edit', header: '', render: (r: HealthResource) => (
              <GovButton variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openEdit(r); }}>Edit</GovButton>
            ) }] : []),
          ]}
          data={resources}
        />
      </GovCard>

      <GovModal open={editOpen} onClose={() => setEditOpen(false)} title={`Update: ${editTarget?.label}`}
        footer={<>
          <GovButton variant="secondary" size="sm" onClick={() => setEditOpen(false)}>Cancel</GovButton>
          <GovButton size="sm" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save
          </GovButton>
        </>}
      >
        <div className="space-y-4">
          <GovInput label="Available" type="number" min="0" value={String(form.available)} onChange={e => setForm(f => ({ ...f, available: Number(e.target.value) }))} />
          <GovInput label="Total"     type="number" min="0" value={String(form.total)}     onChange={e => setForm(f => ({ ...f, total: Number(e.target.value) }))} />
          <GovInput label="Alert Threshold" type="number" min="0" hint="Alert when available falls to or below this number"
            value={String(form.alertThreshold)} onChange={e => setForm(f => ({ ...f, alertThreshold: Number(e.target.value) }))} />
        </div>
      </GovModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulletins tab
// ---------------------------------------------------------------------------

function BulletinsTab({
  bulletins,
  staff,
  onAdd,
}: {
  bulletins: HealthBulletin[];
  staff: StaffUser;
  onAdd: (b: HealthBulletin) => void;
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', severity: 'info', pinned: false });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const canPublish = staff.role === 'manager' || staff.role === 'admin' || staff.agency === 'lhs';

  const filtered = useMemo(() => {
    const active = bulletins.filter(b => !b.expiresAt || new Date(b.expiresAt) > new Date());
    const pinned   = active.filter(b => b.pinned);
    const unpinned = active.filter(b => !b.pinned);
    const sorted = [...pinned, ...unpinned];
    return filter === 'all' ? sorted : sorted.filter(b => b.severity === filter);
  }, [bulletins, filter]);

  async function publish() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        agencies: ['lhs', 'admin'],
        publishedBy: `${staff.firstName} ${staff.lastName}`,
        publishedAt: new Date().toISOString(),
      };
      const rec = await pb.collection('health_bulletins').create(payload).catch(() => null);
      const newBulletin: HealthBulletin = rec ? rec as unknown as HealthBulletin : {
        id: `local-${Date.now()}`,
        ...payload,
        severity: payload.severity as HealthBulletin['severity'],
        agencies: payload.agencies as HealthBulletin['agencies'],
      };
      onAdd(newBulletin);
      setNewOpen(false);
      setForm({ title: '', content: '', severity: 'info', pinned: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <GovSelect
          options={[{ value: 'all', label: 'All Severities' }, { value: 'critical', label: 'Critical' }, { value: 'warning', label: 'Warning' }, { value: 'advisory', label: 'Advisory' }, { value: 'info', label: 'Info' }]}
          value={filter} onChange={e => setFilter(e.target.value)} className="w-44"
        />
        <div className="flex-1" />
        {canPublish && (
          <GovButton size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4" /> New Bulletin
          </GovButton>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <GovCard className="text-center text-[var(--gov-muted)] text-sm py-8">No bulletins.</GovCard>
        )}
        {filtered.map(b => {
          const { bg, text, Icon, label, variant } = severityConfig(b.severity);
          return (
            <div key={b.id} className={`rounded-xl border p-4 ${bg}`}>
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${text}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <GovBadge variant={variant}>{label}</GovBadge>
                    {b.pinned && <GovBadge variant="navy">Pinned</GovBadge>}
                    <span className={`font-semibold text-sm ${text}`}>{b.title}</span>
                  </div>
                  <p className={`text-sm mt-2 leading-relaxed ${text} opacity-90`}>{b.content}</p>
                  <p className="text-xs mt-2 opacity-60">{b.publishedBy} · {fmtDate(b.publishedAt)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <GovModal open={newOpen} onClose={() => setNewOpen(false)} title="Publish Health Bulletin"
        footer={<>
          <GovButton variant="secondary" size="sm" onClick={() => setNewOpen(false)}>Cancel</GovButton>
          <GovButton size="sm" disabled={saving || !form.title || !form.content} onClick={publish}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />} Publish
          </GovButton>
        </>}
      >
        <div className="space-y-4">
          <GovInput label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <GovTextarea label="Content" rows={5} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          <GovSelect
            label="Severity"
            options={[{ value: 'info', label: 'Info' }, { value: 'advisory', label: 'Advisory' }, { value: 'warning', label: 'Warning' }, { value: 'critical', label: 'Critical' }]}
            value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} className="rounded" />
            Pin this bulletin
          </label>
        </div>
      </GovModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main portal
// ---------------------------------------------------------------------------

export default function LHSPortal({ staff }: { staff: StaffUser }) {
  const [tab, setTab] = useState('dashboard');
  const [resources, setResources] = useState<HealthResource[]>(SEED_RESOURCES);
  const [bulletins, setBulletins] = useState<HealthBulletin[]>(SEED_BULLETINS);

  useEffect(() => {
    pb.collection('health_resources').getList(1, 100).then(r => { if (r.items.length) setResources(r.items as unknown as HealthResource[]); }).catch(() => {});
    pb.collection('health_bulletins').getList(1, 50, { sort: '-publishedAt' }).then(r => { if (r.items.length) setBulletins(r.items as unknown as HealthBulletin[]); }).catch(() => {});
  }, []);

  function updateResource(id: string, patch: Partial<HealthResource>) {
    setResources(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  const criticalBulletins = bulletins.filter(b => b.severity === 'critical' && b.pinned);

  const tabs = [
    { id: 'dashboard',  label: 'Dashboard',  icon: <Activity className="w-4 h-4" /> },
    { id: 'resources',  label: 'Resources',  icon: <Activity className="w-4 h-4" /> },
    { id: 'bulletins',  label: 'Bulletins',  icon: <Bell className="w-4 h-4" />,
      ...(criticalBulletins.length > 0 ? {} : {}) },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[var(--gov-bg)] p-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Lennox Health Service"
          sub="Resource allocation, capacity monitoring, and health bulletins"
          action={
            criticalBulletins.length > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg">
                <BellRing className="w-4 h-4 text-red-600 animate-pulse" />
                <span className="text-xs font-semibold text-red-700">{criticalBulletins.length} Critical Alert{criticalBulletins.length > 1 ? 's' : ''}</span>
              </div>
            ) : undefined
          }
        />

        <GovTabs tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'dashboard' && <Dashboard resources={resources} />}
        {tab === 'resources' && <ResourcesTab resources={resources} onUpdate={updateResource} canEdit={staff.role !== 'staff'} />}
        {tab === 'bulletins' && <BulletinsTab bulletins={bulletins} staff={staff} onAdd={b => setBulletins(bs => [b, ...bs])} />}
      </div>
    </div>
  );
}
