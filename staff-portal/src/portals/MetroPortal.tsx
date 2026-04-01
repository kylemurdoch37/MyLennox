import React, { useState, useEffect, useMemo } from 'react';
import { pb } from '../pb';
import type { StaffUser, MetroVehicle, MetroRoute, MaintenanceRequest } from '../types';
import {
  GovButton, GovCard, GovBadge, GovTable, GovModal,
  GovInput, GovSelect, GovTextarea, StatCard, SectionHeader, GovTabs, SearchBar
} from '../components/UI';
import { Bus, MapPin, Wrench, BarChart3, Plus, Loader2, AlertCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function vehicleStatusBadge(s: MetroVehicle['status']) {
  const map: Record<MetroVehicle['status'], { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'default' }> = {
    operational: { label: 'Operational', variant: 'success'  },
    in_service:  { label: 'In Service',  variant: 'info'     },
    depot:       { label: 'Depot',       variant: 'default'  },
    maintenance: { label: 'Maintenance', variant: 'warning'  },
    retired:     { label: 'Retired',     variant: 'danger'   },
  };
  const { label, variant } = map[s] ?? { label: s, variant: 'default' };
  return <GovBadge variant={variant}>{label}</GovBadge>;
}

function routeStatusBadge(s: MetroRoute['status']) {
  const map: Record<MetroRoute['status'], 'success' | 'danger' | 'warning' | 'info'> = {
    active: 'success', suspended: 'danger', diverted: 'warning', reduced: 'info',
  };
  return <GovBadge variant={map[s] ?? 'default'}>{s}</GovBadge>;
}

function priorityBadge(p: MaintenanceRequest['priority']) {
  const map: Record<MaintenanceRequest['priority'], 'default' | 'info' | 'warning' | 'danger'> = {
    low: 'default', medium: 'info', high: 'warning', critical: 'danger',
  };
  return <GovBadge variant={map[p]}>{p}</GovBadge>;
}

function maintenanceStatusBadge(s: MaintenanceRequest['status']) {
  const map: Record<MaintenanceRequest['status'], 'warning' | 'info' | 'success' | 'default'> = {
    open: 'warning', in_progress: 'info', completed: 'success', deferred: 'default',
  };
  return <GovBadge variant={map[s]}>{s.replace('_', ' ')}</GovBadge>;
}

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_VEHICLES: MetroVehicle[] = [
  { id: 'mv1', vehicleId: 'CAR-001', type: 'carriage',     line: 'Red Line',   status: 'in_service',  capacity: 200, lastMaintenance: '2026-01-10', nextMaintenance: '2026-07-10', mileage: 124500 },
  { id: 'mv2', vehicleId: 'CAR-002', type: 'carriage',     line: 'Blue Line',  status: 'operational', capacity: 200, lastMaintenance: '2026-02-05', nextMaintenance: '2026-08-05', mileage: 98300  },
  { id: 'mv3', vehicleId: 'BUS-101', type: 'bus',          line: 'Route 7',    status: 'maintenance', capacity: 55,  lastMaintenance: '2025-11-20', nextMaintenance: '2026-05-20', mileage: 210000 },
  { id: 'mv4', vehicleId: 'BUS-102', type: 'bus',          line: 'Route 12',   status: 'in_service',  capacity: 55,  lastMaintenance: '2026-03-01', nextMaintenance: '2026-09-01', mileage: 88200  },
  { id: 'mv5', vehicleId: 'CAR-003', type: 'carriage',     line: 'Green Line', status: 'depot',       capacity: 200, lastMaintenance: '2026-01-25', nextMaintenance: '2026-07-25', mileage: 156700 },
  { id: 'mv6', vehicleId: 'FS-001',  type: 'ferry_shuttle',line: 'Harbour Cross', status: 'in_service', capacity: 120, lastMaintenance: '2026-02-15', nextMaintenance: '2026-08-15', mileage: 42300  },
];

const SEED_ROUTES: MetroRoute[] = [
  { id: 'r1', routeId: 'RL-1',  name: 'Red Line',      stops: ['Central Station', 'Civic', 'Harbour', 'University', 'North Gate'], frequency: 8,  status: 'active',    activeVehicles: 3 },
  { id: 'r2', routeId: 'BL-1',  name: 'Blue Line',     stops: ['South Terminal', 'Market St', 'Central Station', 'Tech Park', 'Airport'], frequency: 12, status: 'active',    activeVehicles: 2 },
  { id: 'r3', routeId: 'GL-1',  name: 'Green Line',    stops: ['East Depot', 'Old Town', 'Central Station', 'West Lennox'], frequency: 15, status: 'reduced',   activeVehicles: 1, divertedVia: undefined },
  { id: 'r4', routeId: 'R7',    name: 'Route 7 Bus',   stops: ['North Lennox', 'Park Ave', 'Central Bus Station'], frequency: 20, status: 'active',    activeVehicles: 4 },
  { id: 'r5', routeId: 'R12',   name: 'Route 12 Bus',  stops: ['East Lennox', 'Industrial Zone', 'South Terminal'], frequency: 30, status: 'diverted',  activeVehicles: 2, divertedVia: 'via Bypass Rd' },
  { id: 'r6', routeId: 'HC-1',  name: 'Harbour Cross', stops: ['North Pier', 'Harbour Hub', 'South Cove'],         frequency: 25, status: 'active',    activeVehicles: 1 },
];

const SEED_MAINTENANCE: MaintenanceRequest[] = [
  { id: 'mr1', vehicleId: 'mv3', vehicleName: 'BUS-101', title: 'Brake system inspection',    description: 'Unusual noise from front brakes. Immediate inspection required.', priority: 'high',     status: 'in_progress', assignedTo: 'Tech. O. Barnes',   reportedAt: '2026-03-28', estimatedHours: 4 },
  { id: 'mr2', vehicleId: 'mv1', vehicleName: 'CAR-001', title: 'Door sensor replacement',    description: 'Passenger door 3 sensor intermittently failing.',               priority: 'medium',   status: 'open',        assignedTo: undefined,           reportedAt: '2026-03-30', estimatedHours: 2 },
  { id: 'mr3', vehicleId: 'mv5', vehicleName: 'CAR-003', title: 'Pantograph calibration',     description: 'Catenary contact geometry out of spec.',                       priority: 'critical', status: 'open',        assignedTo: undefined,           reportedAt: '2026-03-31', estimatedHours: 6 },
  { id: 'mr4', vehicleId: 'mv4', vehicleName: 'BUS-102', title: 'AC unit service',            description: 'Routine air conditioning maintenance.',                        priority: 'low',      status: 'deferred',    assignedTo: 'Tech. K. Huang',    reportedAt: '2026-03-15', estimatedHours: 3 },
  { id: 'mr5', vehicleId: 'mv6', vehicleName: 'FS-001',  title: 'Engine oil change',          description: '12,000km scheduled service.',                                  priority: 'low',      status: 'completed',   assignedTo: 'Tech. A. Nkosi',    reportedAt: '2026-03-20', resolvedAt: '2026-03-22', estimatedHours: 2 },
];

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function Overview({ vehicles, routes, maintenance }: { vehicles: MetroVehicle[]; routes: MetroRoute[]; maintenance: MaintenanceRequest[] }) {
  const inService   = vehicles.filter(v => v.status === 'in_service').length;
  const inMaint     = vehicles.filter(v => v.status === 'maintenance').length;
  const openTickets = maintenance.filter(m => m.status === 'open' || m.status === 'in_progress').length;
  const critical    = maintenance.filter(m => m.priority === 'critical' && m.status !== 'completed').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="In Service"      value={inService}   icon={<Bus className="w-6 h-6" />}   variant="success" />
        <StatCard label="In Maintenance"  value={inMaint}     icon={<Wrench className="w-6 h-6" />} variant={inMaint > 0 ? 'warning' : 'default'} />
        <StatCard label="Open Tickets"    value={openTickets} variant={openTickets > 3 ? 'warning' : 'default'} />
        <StatCard label="Critical Issues" value={critical}    variant={critical > 0 ? 'danger' : 'success'} />
      </div>

      {critical > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{critical} critical maintenance issue{critical > 1 ? 's' : ''} require immediate attention</p>
            <p className="text-xs text-red-700 mt-0.5">Review in the Maintenance tab.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GovCard noPad>
          <div className="px-5 py-4 border-b border-[var(--gov-border)]">
            <h3 className="font-semibold text-sm">Route Status</h3>
          </div>
          <div className="divide-y divide-[var(--gov-border)]">
            {routes.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-[var(--gov-muted)]">Every {r.frequency} min · {r.activeVehicles} vehicles active</p>
                  {r.divertedVia && <p className="text-xs text-amber-700 mt-0.5">{r.divertedVia}</p>}
                </div>
                {routeStatusBadge(r.status)}
              </div>
            ))}
          </div>
        </GovCard>

        <GovCard noPad>
          <div className="px-5 py-4 border-b border-[var(--gov-border)]">
            <h3 className="font-semibold text-sm">Open Maintenance</h3>
          </div>
          <GovTable
            columns={[
              { key: 'vehicleName', header: 'Vehicle' },
              { key: 'title',       header: 'Issue' },
              { key: 'priority',    header: 'Priority', render: r => priorityBadge(r.priority) },
              { key: 'status',      header: 'Status',   render: r => maintenanceStatusBadge(r.status) },
            ]}
            data={maintenance.filter(m => m.status !== 'completed').slice(0, 5)}
          />
        </GovCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vehicles tab
// ---------------------------------------------------------------------------

function VehiclesTab({ vehicles }: { vehicles: MetroVehicle[] }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = useMemo(() =>
    vehicles.filter(v => {
      const q = search.toLowerCase();
      return (v.vehicleId.toLowerCase().includes(q) || v.line.toLowerCase().includes(q)) &&
        (filterType === 'all' || v.type === filterType);
    }), [vehicles, search, filterType]
  );

  // Highlight vehicles due for maintenance soon
  const now = Date.now();
  const dueSoon = (v: MetroVehicle) => {
    const d = new Date(v.nextMaintenance).getTime() - now;
    return d < 30 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search vehicles…" className="flex-1" />
        <GovSelect
          options={[{ value: 'all', label: 'All Types' }, { value: 'carriage', label: 'Carriage' }, { value: 'bus', label: 'Bus' }, { value: 'ferry_shuttle', label: 'Ferry Shuttle' }]}
          value={filterType} onChange={e => setFilterType(e.target.value)} className="w-44"
        />
      </div>
      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'vehicleId',       header: 'ID' },
            { key: 'type',            header: 'Type',    render: r => <GovBadge>{r.type.replace('_', ' ')}</GovBadge> },
            { key: 'line',            header: 'Line / Route' },
            { key: 'status',          header: 'Status',  render: r => vehicleStatusBadge(r.status) },
            { key: 'capacity',        header: 'Capacity', render: r => `${r.capacity} pax` },
            { key: 'mileage',         header: 'Mileage',  render: r => `${r.mileage.toLocaleString()} km` },
            { key: 'nextMaintenance', header: 'Next Service', render: r => (
              <span className={dueSoon(r) ? 'text-amber-700 font-medium' : ''}>{fmtDate(r.nextMaintenance)}</span>
            )},
          ]}
          data={filtered}
        />
      </GovCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Routes tab
// ---------------------------------------------------------------------------

function RoutesTab({ routes, canManage }: { routes: MetroRoute[]; canManage: boolean }) {
  const [selected, setSelected] = useState<MetroRoute | null>(null);

  return (
    <div className="space-y-4">
      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'routeId',        header: 'ID' },
            { key: 'name',           header: 'Name' },
            { key: 'frequency',      header: 'Frequency',  render: r => `${r.frequency} min` },
            { key: 'activeVehicles', header: 'Active Vehicles' },
            { key: 'status',         header: 'Status',     render: r => routeStatusBadge(r.status) },
            { key: 'divertedVia',    header: 'Notes',      render: r => r.divertedVia ?? '—' },
          ]}
          data={routes}
          onRowClick={row => setSelected(row)}
        />
      </GovCard>

      <GovModal open={!!selected} onClose={() => setSelected(null)} title="Route Details">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[var(--gov-muted)] text-xs">Route ID</p><p className="font-medium">{selected.routeId}</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Status</p>{routeStatusBadge(selected.status)}</div>
              <div><p className="text-[var(--gov-muted)] text-xs">Frequency</p><p className="font-medium">Every {selected.frequency} min</p></div>
              <div><p className="text-[var(--gov-muted)] text-xs">Active Vehicles</p><p className="font-medium">{selected.activeVehicles}</p></div>
            </div>
            <div>
              <p className="text-[var(--gov-muted)] text-xs mb-2">Stops</p>
              <ol className="space-y-1">
                {selected.stops.map((stop, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[var(--gov-navy)] text-white text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                    <span>{stop}</span>
                  </li>
                ))}
              </ol>
            </div>
            {selected.divertedVia && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-800">Diversion: {selected.divertedVia}</p>
              </div>
            )}
          </div>
        )}
      </GovModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Maintenance tab
// ---------------------------------------------------------------------------

function MaintenanceTab({
  maintenance,
  vehicles,
  staff,
  onUpdate,
}: {
  maintenance: MaintenanceRequest[];
  vehicles: MetroVehicle[];
  staff: StaffUser;
  onUpdate: (id: string, patch: Partial<MaintenanceRequest>) => void;
}) {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus]     = useState('open');
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', title: '', description: '', priority: 'medium', estimatedHours: '' });
  const [saving, setSaving] = useState(false);
  const [localMaint, setLocalMaint] = useState(maintenance);

  useEffect(() => { setLocalMaint(maintenance); }, [maintenance]);

  const filtered = useMemo(() =>
    localMaint.filter(m => {
      const q = search.toLowerCase();
      const matchSearch = m.title.toLowerCase().includes(q) || m.vehicleName.toLowerCase().includes(q);
      const matchPri    = filterPriority === 'all' || m.priority === filterPriority;
      const matchStatus = filterStatus === 'all' || m.status === filterStatus || (filterStatus === 'open' && (m.status === 'open' || m.status === 'in_progress'));
      return matchSearch && matchPri && matchStatus;
    }), [localMaint, search, filterPriority, filterStatus]
  );

  async function create() {
    setSaving(true);
    try {
      const veh = vehicles.find(v => v.id === form.vehicleId);
      const payload = {
        ...form,
        vehicleName: veh?.vehicleId ?? form.vehicleId,
        status: 'open',
        reportedAt: new Date().toISOString().slice(0, 10),
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      };
      const rec = await pb.collection('maintenance_requests').create(payload).catch(() => null);
      const newReq: MaintenanceRequest = rec ? rec as unknown as MaintenanceRequest : {
        id: `local-${Date.now()}`,
        ...payload,
        priority: payload.priority as MaintenanceRequest['priority'],
        status: 'open',
      };
      setLocalMaint(m => [newReq, ...m]);
      setNewOpen(false);
      setForm({ vehicleId: '', title: '', description: '', priority: 'medium', estimatedHours: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tickets…" className="flex-1" />
        <GovSelect
          options={[{ value: 'all', label: 'All Priorities' }, { value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]}
          value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="sm:w-44"
        />
        <GovSelect
          options={[{ value: 'open', label: 'Open / In Progress' }, { value: 'all', label: 'All Statuses' }, { value: 'completed', label: 'Completed' }, { value: 'deferred', label: 'Deferred' }]}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="sm:w-44"
        />
        <GovButton size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4" /> New Ticket
        </GovButton>
      </div>

      <GovCard noPad>
        <GovTable
          columns={[
            { key: 'vehicleName', header: 'Vehicle' },
            { key: 'title',       header: 'Issue' },
            { key: 'priority',    header: 'Priority', render: r => priorityBadge(r.priority) },
            { key: 'status',      header: 'Status',   render: r => maintenanceStatusBadge(r.status) },
            { key: 'assignedTo',  header: 'Assigned To', render: r => r.assignedTo ?? <span className="text-[var(--gov-muted)]">Unassigned</span> },
            { key: 'reportedAt',  header: 'Reported',    render: r => fmtDate(r.reportedAt) },
            { key: 'estimatedHours', header: 'Est. Hrs', render: r => r.estimatedHours ?? '—' },
          ]}
          data={filtered}
          emptyMessage="No maintenance tickets match your filters."
        />
      </GovCard>

      <GovModal open={newOpen} onClose={() => setNewOpen(false)} title="New Maintenance Request"
        footer={<>
          <GovButton variant="secondary" size="sm" onClick={() => setNewOpen(false)}>Cancel</GovButton>
          <GovButton size="sm" disabled={saving || !form.vehicleId || !form.title} onClick={create}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />} Submit
          </GovButton>
        </>}
      >
        <div className="space-y-4">
          <GovSelect
            label="Vehicle"
            options={[{ value: '', label: 'Select vehicle…' }, ...vehicles.map(v => ({ value: v.id, label: `${v.vehicleId} (${v.line})` }))]}
            value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
          />
          <GovInput label="Issue Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <GovTextarea label="Description" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <GovSelect
              label="Priority"
              options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]}
              value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            />
            <GovInput label="Est. Hours" type="number" min="0" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
          </div>
        </div>
      </GovModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main portal
// ---------------------------------------------------------------------------

export default function MetroPortal({ staff }: { staff: StaffUser }) {
  const [tab, setTab] = useState('overview');
  const [vehicles, setVehicles]     = useState<MetroVehicle[]>(SEED_VEHICLES);
  const [routes, setRoutes]         = useState<MetroRoute[]>(SEED_ROUTES);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>(SEED_MAINTENANCE);

  useEffect(() => {
    pb.collection('metro_vehicles').getList(1, 100).then(r => { if (r.items.length) setVehicles(r.items as unknown as MetroVehicle[]); }).catch(() => {});
    pb.collection('metro_routes').getList(1, 50).then(r => { if (r.items.length) setRoutes(r.items as unknown as MetroRoute[]); }).catch(() => {});
    pb.collection('maintenance_requests').getList(1, 200, { sort: '-reportedAt' }).then(r => { if (r.items.length) setMaintenance(r.items as unknown as MaintenanceRequest[]); }).catch(() => {});
  }, []);

  function patchMaintenance(id: string, patch: Partial<MaintenanceRequest>) {
    setMaintenance(m => m.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  const tabs = [
    { id: 'overview',     label: 'Overview',     icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'vehicles',     label: 'Vehicles',     icon: <Bus className="w-4 h-4" /> },
    { id: 'routes',       label: 'Routes',       icon: <MapPin className="w-4 h-4" /> },
    { id: 'maintenance',  label: 'Maintenance',  icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[var(--gov-bg)] p-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          title="Lennox Metro"
          sub="Transit operations, timetable management, and fleet maintenance"
        />

        <GovTabs tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'overview'    && <Overview vehicles={vehicles} routes={routes} maintenance={maintenance} />}
        {tab === 'vehicles'    && <VehiclesTab vehicles={vehicles} />}
        {tab === 'routes'      && <RoutesTab routes={routes} canManage={staff.role !== 'staff'} />}
        {tab === 'maintenance' && <MaintenanceTab maintenance={maintenance} vehicles={vehicles} staff={staff} onUpdate={patchMaintenance} />}
      </div>
    </div>
  );
}
