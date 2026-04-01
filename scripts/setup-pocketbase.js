#!/usr/bin/env node
/**
 * MyLennox — PocketBase collection setup script
 *
 * Run this ONCE after starting PocketBase for the first time to create
 * all the collections that mirror the Firestore schema.
 *
 * Prerequisites:
 *   1. Download PocketBase from https://pocketbase.io/docs/
 *   2. Run:  ./pocketbase serve
 *   3. Visit http://localhost:8090/_/ and create your admin account
 *   4. Then run this script:
 *        node scripts/setup-pocketbase.js
 *        node scripts/setup-pocketbase.js --url http://192.168.1.42:8090  (custom URL)
 *
 * The script will prompt for your PocketBase admin email and password,
 * then create all required collections.
 */

import readline from 'readline';
import process from 'process';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const urlFlag = args.indexOf('--url');
const PB_URL = urlFlag !== -1 ? args[urlFlag + 1] : 'http://localhost:8090';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function pbRequest(path, method, body, token) {
  const res = await fetch(`${PB_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// ---------------------------------------------------------------------------
// Collection schema definitions
// ---------------------------------------------------------------------------

/**
 * Each entry describes one PocketBase collection.
 * For the 'users' collection we use 'auth' type (has built-in email+password).
 * All others are 'base' type (regular data).
 *
 * Field types: text, number, bool, date, json, relation, file
 */
const COLLECTIONS = [
  // -------------------------------------------------------------------------
  // users — PocketBase auth collection (replaces Firebase Auth + 'users' docs)
  // -------------------------------------------------------------------------
  {
    name: 'users',
    type: 'auth',
    fields: [
      { name: 'firstName',    type: 'text' },
      { name: 'lastName',     type: 'text' },
      { name: 'phone',        type: 'text' },
      { name: 'nationality',  type: 'text' },
      { name: 'dob',          type: 'text' },
      { name: 'tier',         type: 'number' },   // UserTier enum (1–4)
      { name: 'workplace',    type: 'text' },
      { name: 'nearestHub',   type: 'text' },
      { name: 'commuteType',  type: 'json' },     // string[]
      { name: 'workStartDate',type: 'text' },
      { name: 'lennoxPassId', type: 'text' },
      { name: 'placeOfBirth', type: 'text' },
      { name: 'occupation',   type: 'text' },
      { name: 'lhdbUnit',     type: 'text' },
      { name: 'createdAt',    type: 'text' },
    ],
  },

  // -------------------------------------------------------------------------
  // vehicles
  // -------------------------------------------------------------------------
  {
    name: 'vehicles',
    type: 'base',
    fields: [
      { name: 'uid',            type: 'text',   required: true },
      { name: 'plate',          type: 'text' },
      { name: 'make',           type: 'text' },
      { name: 'model',          type: 'text' },
      { name: 'color',          type: 'text' },
      { name: 'autoPayEnabled', type: 'bool' },
      { name: 'createdAt',      type: 'text' },
    ],
  },

  // -------------------------------------------------------------------------
  // payments
  // -------------------------------------------------------------------------
  {
    name: 'payments',
    type: 'base',
    fields: [
      { name: 'uid',       type: 'text',   required: true },
      { name: 'amount',    type: 'number' },
      { name: 'type',      type: 'text' },    // 'congestion' | 'ferry' | 'toll'
      { name: 'status',    type: 'text' },    // 'paid' | 'unpaid'
      { name: 'timestamp', type: 'text' },
      { name: 'entryTime', type: 'text' },
    ],
  },

  // -------------------------------------------------------------------------
  // bank_accounts
  // -------------------------------------------------------------------------
  {
    name: 'bank_accounts',
    type: 'base',
    fields: [
      { name: 'uid',           type: 'text',   required: true },
      { name: 'accountNumber', type: 'text' },
      { name: 'sortCode',      type: 'text' },
      { name: 'balance',       type: 'number' },
      { name: 'currency',      type: 'text' },   // 'L$' | 'GBP'
      { name: 'type',          type: 'text' },   // 'current' | 'savings'
      { name: 'status',        type: 'text' },   // 'active' | 'pending'
      { name: 'createdAt',     type: 'text' },
    ],
  },

  // -------------------------------------------------------------------------
  // bank_transactions
  // -------------------------------------------------------------------------
  {
    name: 'bank_transactions',
    type: 'base',
    fields: [
      { name: 'uid',         type: 'text',   required: true },
      { name: 'accountId',   type: 'text',   required: true },
      { name: 'amount',      type: 'number' },
      { name: 'type',        type: 'text' },    // 'debit' | 'credit'
      { name: 'description', type: 'text' },
      { name: 'category',    type: 'text' },
      { name: 'date',        type: 'text' },
      { name: 'status',      type: 'text' },    // 'completed' | 'pending'
      { name: 'reference',   type: 'text' },
    ],
  },

  // -------------------------------------------------------------------------
  // housing_applications
  // -------------------------------------------------------------------------
  {
    name: 'housing_applications',
    type: 'base',
    fields: [
      { name: 'uid',         type: 'text',   required: true },
      { name: 'status',      type: 'text' },
      { name: 'type',        type: 'text' },
      { name: 'bedrooms',    type: 'number' },
      { name: 'area',        type: 'text' },
      { name: 'notes',       type: 'text' },
      { name: 'createdAt',   type: 'text' },
      { name: 'updatedAt',   type: 'text' },
    ],
  },

  // -------------------------------------------------------------------------
  // pr_applications
  // -------------------------------------------------------------------------
  {
    name: 'pr_applications',
    type: 'base',
    fields: [
      { name: 'uid',         type: 'text',   required: true },
      { name: 'status',      type: 'text' },
      { name: 'step',        type: 'number' },
      { name: 'notes',       type: 'text' },
      { name: 'createdAt',   type: 'text' },
      { name: 'updatedAt',   type: 'text' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nMyLennox — PocketBase setup\nURL: ${PB_URL}\n`);

  // Authenticate as admin
  const email = await prompt('Admin email: ');
  const password = await prompt('Admin password: ');

  let token;
  try {
    const data = await pbRequest('/admins/auth-with-password', 'POST', { identity: email, password });
    token = data.token;
    console.log('✅ Authenticated as admin\n');
  } catch (err) {
    console.error('❌ Admin auth failed:', err.message);
    process.exit(1);
  }

  // Fetch existing collections so we can skip ones already created
  const existing = await pbRequest('/collections?perPage=200', 'GET', null, token);
  const existingNames = new Set(existing.items.map(c => c.name));

  // Create missing collections
  for (const col of COLLECTIONS) {
    if (existingNames.has(col.name)) {
      console.log(`⏭  ${col.name} — already exists, skipping`);
      continue;
    }
    try {
      await pbRequest('/collections', 'POST', {
        name: col.name,
        type: col.type,
        schema: col.fields.map(f => ({
          name: f.name,
          type: f.type,
          required: f.required ?? false,
          options: {},
        })),
      }, token);
      console.log(`✅ Created collection: ${col.name}`);
    } catch (err) {
      console.error(`❌ Failed to create ${col.name}:`, err.message);
    }
  }

  console.log(`
Done! Collections are ready.

Next steps:
  1. Set VITE_DB_BACKEND=pocketbase in your .env file
  2. Set VITE_PB_URL=http://localhost:8090 (or your PC's LAN IP for Android)
  3. Run: npm run dev

To test on Android:
  - Find your PC's local IP: ipconfig (Windows) or ifconfig (Mac/Linux)
  - Set VITE_PB_URL=http://<your-pc-ip>:8090
  - Make sure your phone and PC are on the same Wi-Fi network
  - Run: npm run build && npx cap sync && npx cap run android
`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
