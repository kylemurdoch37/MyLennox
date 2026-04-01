#!/usr/bin/env node
/**
 * Firebase → PocketBase Migration Script (Staff Portal)
 *
 * Migrates government operational data from Firebase Firestore to PocketBase.
 * Run AFTER setup-pocketbase.js has created the collections.
 *
 * Usage:
 *   POCKETBASE_URL=http://localhost:8090 \
 *   POCKETBASE_ADMIN_EMAIL=admin@lennox.gov \
 *   POCKETBASE_ADMIN_PASSWORD=yourpassword \
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   node scripts/migrate-firebase.js
 *
 * Collections migrated:
 *   housing_applications, housing_units, marine_vessels, marine_licenses,
 *   marine_schedules, metro_vehicles, metro_routes, maintenance_requests,
 *   health_resources, health_bulletins
 */

import PocketBase from 'pocketbase';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';

const PB_URL      = process.env.POCKETBASE_URL            || 'http://localhost:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL    || 'admin@lennox.gov';
const ADMIN_PASS  = process.env.POCKETBASE_ADMIN_PASSWORD || '';
const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT_ID;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pb = new PocketBase(PB_URL);

async function migrateCollection(firestore, firestoreCollection, pbCollection, transform = r => r) {
  console.log(`  Migrating ${firestoreCollection} → ${pbCollection}…`);
  const snapshot = await firestore.collection(firestoreCollection).get();
  if (snapshot.empty) { console.log('    (empty, skipping)'); return; }

  let success = 0, skipped = 0, failed = 0;
  for (const doc of snapshot.docs) {
    const data = transform({ id: doc.id, ...doc.data() });
    try {
      // Try create with the Firebase ID as PocketBase ID
      await pb.collection(pbCollection).create({ ...data, id: doc.id });
      success++;
    } catch (err) {
      if (err?.status === 400 && JSON.stringify(err.data).includes('already exists')) {
        // Already migrated — try update
        try {
          await pb.collection(pbCollection).update(doc.id, data);
          skipped++;
        } catch { failed++; }
      } else {
        console.warn(`    ✗ ${doc.id}: ${err?.message ?? err}`);
        failed++;
      }
    }
  }
  console.log(`    ✓ ${success} created, ${skipped} updated, ${failed} failed`);
}

// ---------------------------------------------------------------------------
// Field normalisation (Firebase Timestamps → ISO strings)
// ---------------------------------------------------------------------------

function normaliseTimestamps(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && typeof v.toDate === 'function') {
      out[k] = v.toDate().toISOString();
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = normaliseTimestamps(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nStaff Portal Firebase → PocketBase Migration`);
  console.log(`PocketBase: ${PB_URL}`);

  if (!ADMIN_PASS) { console.error('POCKETBASE_ADMIN_PASSWORD required'); process.exit(1); }

  // Authenticate PocketBase
  await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS)
    .catch(e => { console.error('PB auth failed:', e.message); process.exit(1); });
  console.log('PocketBase: authenticated\n');

  // Initialise Firebase Admin
  let firestore;
  try {
    const app = FIREBASE_PROJECT
      ? initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS), projectId: FIREBASE_PROJECT })
      : initializeApp();
    firestore = getFirestore(app);
    console.log('Firebase: connected\n');
  } catch (e) {
    console.error('Firebase init failed:', e.message);
    console.error('Ensure GOOGLE_APPLICATION_CREDENTIALS points to your service account JSON.');
    process.exit(1);
  }

  const t = normaliseTimestamps;

  // Migrate all collections
  await migrateCollection(firestore, 'housing_applications', 'housing_applications', t);
  await migrateCollection(firestore, 'housing_units',        'housing_units',        t);
  await migrateCollection(firestore, 'viewing_schedules',    'viewing_schedules',    t);
  await migrateCollection(firestore, 'marine_vessels',       'marine_vessels',       t);
  await migrateCollection(firestore, 'marine_licenses',      'marine_licenses',      t);
  await migrateCollection(firestore, 'marine_schedules',     'marine_schedules',     t);
  await migrateCollection(firestore, 'metro_vehicles',       'metro_vehicles',       t);
  await migrateCollection(firestore, 'metro_routes',         'metro_routes',         t);
  await migrateCollection(firestore, 'maintenance_requests', 'maintenance_requests', t);
  await migrateCollection(firestore, 'health_resources',     'health_resources',     t);
  await migrateCollection(firestore, 'health_bulletins',     'health_bulletins',     t);

  console.log('\nMigration complete.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
