#!/usr/bin/env node
/**
 * Staff Portal — PocketBase Setup Script
 *
 * Creates all collections required by the Lennox Government Staff Portal.
 *
 * Usage:
 *   POCKETBASE_URL=http://localhost:8090 \
 *   POCKETBASE_ADMIN_EMAIL=admin@lennox.gov \
 *   POCKETBASE_ADMIN_PASSWORD=yourpassword \
 *   node scripts/setup-pocketbase.js
 *
 * Collections created:
 *   staff (auth)           — SSO accounts for government employees
 *   housing_applications   — LHDB citizen housing applications
 *   housing_units          — LHDB housing stock
 *   viewing_schedules      — LHDB property viewing appointments
 *   marine_vessels         — Lennox Marine fleet
 *   marine_licenses        — Marine operator licenses
 *   marine_schedules       — Port departure/arrival schedules
 *   metro_vehicles         — Transit fleet
 *   metro_routes           — Transit lines & routes
 *   maintenance_requests   — Vehicle maintenance tickets
 *   health_resources       — LHS facility resource tracking
 *   health_bulletins       — LHS published health alerts
 */

import PocketBase from 'pocketbase';

const PB_URL      = process.env.POCKETBASE_URL           || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL   || 'admin@lennox.gov';
const ADMIN_PASS  = process.env.POCKETBASE_ADMIN_PASSWORD || '';

const pb = new PocketBase(PB_URL);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function upsertCollection(schema) {
  const existing = await pb.collections.getOne(schema.name).catch(() => null);
  if (existing) {
    console.log(`  ↷  ${schema.name} (already exists, skipping)`);
    return;
  }
  await pb.collections.create(schema);
  console.log(`  ✓  ${schema.name}`);
}

// ---------------------------------------------------------------------------
// Collection schemas
// ---------------------------------------------------------------------------

const collections = [
  // ── Staff auth collection ────────────────────────────────────────────────
  {
    name:   'staff',
    type:   'auth',
    schema: [
      { name: 'firstName',  type: 'text',   required: true },
      { name: 'lastName',   type: 'text',   required: true },
      { name: 'agency',     type: 'select', required: true, options: { maxSelect: 1, values: ['lhdb', 'marine', 'metro', 'lhs', 'admin'] } },
      { name: 'role',       type: 'select', required: true, options: { maxSelect: 1, values: ['staff', 'manager', 'admin'] } },
      { name: 'department', type: 'text' },
      { name: 'lastLogin',  type: 'date' },
    ],
    options: {
      allowEmailAuth:    true,
      allowOAuth2Auth:   false,
      allowUsernameAuth: false,
      requireEmail:      true,
    },
  },

  // ── LHDB: Housing Applications ───────────────────────────────────────────
  {
    name:   'housing_applications',
    type:   'base',
    schema: [
      { name: 'uid',              type: 'text',   required: true },
      { name: 'applicantName',    type: 'text',   required: true },
      { name: 'applicantEmail',   type: 'email',  required: true },
      { name: 'applicantPhone',   type: 'text' },
      { name: 'bedrooms',         type: 'number', required: true },
      { name: 'preferredArea',    type: 'text' },
      { name: 'monthlyIncome',    type: 'number', required: true },
      { name: 'householdSize',    type: 'number', required: true },
      { name: 'currentSituation', type: 'text',   required: true },
      { name: 'notes',            type: 'text' },
      { name: 'status',           type: 'select', required: true, options: { maxSelect: 1, values: ['pending', 'approved', 'rejected', 'waitlisted', 'viewing_scheduled'] } },
      { name: 'assignedUnitId',   type: 'text' },
    ],
  },

  // ── LHDB: Housing Stock ──────────────────────────────────────────────────
  {
    name:   'housing_units',
    type:   'base',
    schema: [
      { name: 'blockName',        type: 'text',   required: true },
      { name: 'floor',            type: 'number' },
      { name: 'unitNumber',       type: 'text',   required: true },
      { name: 'bedrooms',         type: 'number', required: true },
      { name: 'bathrooms',        type: 'number' },
      { name: 'sqm',              type: 'number' },
      { name: 'area',             type: 'text' },
      { name: 'status',           type: 'select', required: true, options: { maxSelect: 1, values: ['available', 'occupied', 'maintenance', 'reserved'] } },
      { name: 'baseRent',         type: 'number', required: true },
      { name: 'currentTenantId',  type: 'text' },
      { name: 'lastVacatedAt',    type: 'date' },
    ],
  },

  // ── LHDB: Viewing Schedules ──────────────────────────────────────────────
  {
    name:   'viewing_schedules',
    type:   'base',
    schema: [
      { name: 'applicationId', type: 'text', required: true },
      { name: 'unitId',        type: 'text', required: true },
      { name: 'staffId',       type: 'text', required: true },
      { name: 'scheduledAt',   type: 'date', required: true },
      { name: 'status',        type: 'select', options: { maxSelect: 1, values: ['scheduled', 'completed', 'cancelled', 'no_show'] } },
      { name: 'notes',         type: 'text' },
    ],
  },

  // ── Marine: Vessels ──────────────────────────────────────────────────────
  {
    name:   'marine_vessels',
    type:   'base',
    schema: [
      { name: 'name',           type: 'text',   required: true },
      { name: 'registration',   type: 'text',   required: true },
      { name: 'type',           type: 'select', options: { maxSelect: 1, values: ['patrol', 'ferry', 'cargo', 'research', 'maintenance'] } },
      { name: 'status',         type: 'select', options: { maxSelect: 1, values: ['active', 'docked', 'maintenance', 'decommissioned'] } },
      { name: 'currentPort',    type: 'text' },
      { name: 'nextPort',       type: 'text' },
      { name: 'nextDeparture',  type: 'date' },
      { name: 'captain',        type: 'text' },
      { name: 'crewCount',      type: 'number' },
      { name: 'lastInspection', type: 'date' },
      { name: 'notes',          type: 'text' },
    ],
  },

  // ── Marine: Licenses ─────────────────────────────────────────────────────
  {
    name:   'marine_licenses',
    type:   'base',
    schema: [
      { name: 'applicantName', type: 'text',   required: true },
      { name: 'applicantId',   type: 'text',   required: true },
      { name: 'licenseType',   type: 'select', options: { maxSelect: 1, values: ['recreational', 'commercial', 'professional', 'fishing'] } },
      { name: 'issueDate',     type: 'date' },
      { name: 'expiryDate',    type: 'date', required: true },
      { name: 'status',        type: 'select', options: { maxSelect: 1, values: ['active', 'expired', 'suspended', 'pending'] } },
      { name: 'vessel',        type: 'text' },
      { name: 'notes',         type: 'text' },
    ],
  },

  // ── Marine: Schedules ────────────────────────────────────────────────────
  {
    name:   'marine_schedules',
    type:   'base',
    schema: [
      { name: 'vesselId',       type: 'text', required: true },
      { name: 'vesselName',     type: 'text' },
      { name: 'origin',         type: 'text', required: true },
      { name: 'destination',    type: 'text', required: true },
      { name: 'departureTime',  type: 'date', required: true },
      { name: 'arrivalTime',    type: 'date' },
      { name: 'cargoType',      type: 'text' },
      { name: 'passengerCount', type: 'number' },
      { name: 'status',         type: 'select', options: { maxSelect: 1, values: ['scheduled', 'departed', 'arrived', 'delayed', 'cancelled'] } },
    ],
  },

  // ── Metro: Vehicles ──────────────────────────────────────────────────────
  {
    name:   'metro_vehicles',
    type:   'base',
    schema: [
      { name: 'vehicleId',       type: 'text',   required: true },
      { name: 'type',            type: 'select', options: { maxSelect: 1, values: ['carriage', 'bus', 'ferry_shuttle'] } },
      { name: 'line',            type: 'text' },
      { name: 'status',          type: 'select', options: { maxSelect: 1, values: ['operational', 'in_service', 'depot', 'maintenance', 'retired'] } },
      { name: 'capacity',        type: 'number' },
      { name: 'lastMaintenance', type: 'date' },
      { name: 'nextMaintenance', type: 'date' },
      { name: 'mileage',         type: 'number' },
      { name: 'notes',           type: 'text' },
    ],
  },

  // ── Metro: Routes ────────────────────────────────────────────────────────
  {
    name:   'metro_routes',
    type:   'base',
    schema: [
      { name: 'routeId',        type: 'text',   required: true },
      { name: 'name',           type: 'text',   required: true },
      { name: 'stops',          type: 'json' },
      { name: 'frequency',      type: 'number' },
      { name: 'status',         type: 'select', options: { maxSelect: 1, values: ['active', 'suspended', 'diverted', 'reduced'] } },
      { name: 'divertedVia',    type: 'text' },
      { name: 'activeVehicles', type: 'number' },
    ],
  },

  // ── Metro: Maintenance Requests ──────────────────────────────────────────
  {
    name:   'maintenance_requests',
    type:   'base',
    schema: [
      { name: 'vehicleId',       type: 'text', required: true },
      { name: 'vehicleName',     type: 'text' },
      { name: 'title',           type: 'text', required: true },
      { name: 'description',     type: 'text' },
      { name: 'priority',        type: 'select', options: { maxSelect: 1, values: ['low', 'medium', 'high', 'critical'] } },
      { name: 'status',          type: 'select', options: { maxSelect: 1, values: ['open', 'in_progress', 'completed', 'deferred'] } },
      { name: 'assignedTo',      type: 'text' },
      { name: 'reportedAt',      type: 'date' },
      { name: 'resolvedAt',      type: 'date' },
      { name: 'estimatedHours',  type: 'number' },
    ],
  },

  // ── LHS: Health Resources ────────────────────────────────────────────────
  {
    name:   'health_resources',
    type:   'base',
    schema: [
      { name: 'facilityName',    type: 'text',   required: true },
      { name: 'resourceType',    type: 'select', options: { maxSelect: 1, values: ['bed', 'icu_bed', 'ventilator', 'staff', 'supply'] } },
      { name: 'label',           type: 'text',   required: true },
      { name: 'available',       type: 'number', required: true },
      { name: 'total',           type: 'number', required: true },
      { name: 'unit',            type: 'text' },
      { name: 'alertThreshold',  type: 'number' },
    ],
  },

  // ── LHS: Health Bulletins ────────────────────────────────────────────────
  {
    name:   'health_bulletins',
    type:   'base',
    schema: [
      { name: 'title',        type: 'text', required: true },
      { name: 'content',      type: 'text', required: true },
      { name: 'severity',     type: 'select', options: { maxSelect: 1, values: ['info', 'advisory', 'warning', 'critical'] } },
      { name: 'agencies',     type: 'json' },
      { name: 'publishedBy',  type: 'text' },
      { name: 'publishedAt',  type: 'date' },
      { name: 'expiresAt',    type: 'date' },
      { name: 'pinned',       type: 'bool' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed staff accounts
// ---------------------------------------------------------------------------

async function seedStaffAccounts() {
  const accounts = [
    { email: 'lhdb.manager@lennox.gov',   password: 'LennoxGov2026!', firstName: 'Sarah',   lastName: 'Clarke',    agency: 'lhdb',   role: 'manager',  department: 'Allocations' },
    { email: 'lhdb.staff@lennox.gov',     password: 'LennoxGov2026!', firstName: 'James',   lastName: 'Okafor',    agency: 'lhdb',   role: 'staff',    department: 'Client Services' },
    { email: 'marine.manager@lennox.gov', password: 'LennoxGov2026!', firstName: 'Ana',     lastName: 'Takahashi', agency: 'marine', role: 'manager',  department: 'Operations' },
    { email: 'metro.manager@lennox.gov',  password: 'LennoxGov2026!', firstName: 'David',   lastName: 'Mensah',    agency: 'metro',  role: 'manager',  department: 'Transit Ops' },
    { email: 'lhs.manager@lennox.gov',    password: 'LennoxGov2026!', firstName: 'Priya',   lastName: 'Sharma',    agency: 'lhs',    role: 'manager',  department: 'Operations' },
    { email: 'admin@lennox.gov',          password: 'LennoxGov2026!', firstName: 'William', lastName: 'Hart',      agency: 'admin',  role: 'admin',    department: 'Government Digital Services' },
  ];

  console.log('\nSeeding staff accounts…');
  for (const acc of accounts) {
    try {
      await pb.collection('staff').create({
        email:          acc.email,
        password:       acc.password,
        passwordConfirm: acc.password,
        firstName:      acc.firstName,
        lastName:       acc.lastName,
        agency:         acc.agency,
        role:           acc.role,
        department:     acc.department,
        emailVisibility: false,
        verified:       true,
      });
      console.log(`  ✓  ${acc.email}`);
    } catch (err) {
      if (err?.status === 400 && JSON.stringify(err.data).includes('already exists')) {
        console.log(`  ↷  ${acc.email} (already exists)`);
      } else {
        console.warn(`  ✗  ${acc.email}: ${err?.message ?? err}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nConnecting to PocketBase at ${PB_URL}…`);

  if (!ADMIN_PASS) {
    console.error('Error: POCKETBASE_ADMIN_PASSWORD env var required.');
    process.exit(1);
  }

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
    console.log('Authenticated as admin.\n');
  } catch (err) {
    console.error('Failed to authenticate:', err?.message ?? err);
    process.exit(1);
  }

  console.log('Creating collections…');
  for (const col of collections) {
    await upsertCollection(col);
  }

  await seedStaffAccounts();

  console.log('\nSetup complete.\n');
  console.log('Staff Portal: http://localhost:4000');
  console.log('Default credentials: <agency>.manager@lennox.gov / LennoxGov2026!');
  console.log('Admin: admin@lennox.gov / LennoxGov2026!\n');
}

main().catch(err => { console.error(err); process.exit(1); });
