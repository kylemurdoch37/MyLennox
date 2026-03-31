/// <reference types="vite/client" />
/**
 * Database abstraction layer for MyLennox.
 *
 * Exports the same API that App.tsx uses from Firebase so that switching
 * backends requires changing only two import lines in App.tsx:
 *
 *   // Before (Firebase):
 *   import { auth, db, handleFirestoreError, OperationType } from './firebase';
 *   import { ... } from 'firebase/auth';
 *   import { ... } from 'firebase/firestore';
 *
 *   // After (this file — works with both backends):
 *   import { auth, db, handleFirestoreError, OperationType, ... } from './db';
 *
 * Backend is selected via environment variable:
 *   VITE_DB_BACKEND=firebase    (default) — uses Firebase / Firebase Emulators
 *   VITE_DB_BACKEND=pocketbase  — uses PocketBase running on your PC
 *
 * PocketBase server URL (for PocketBase backend):
 *   VITE_PB_URL=http://localhost:8090  (default)
 *   Use your PC's LAN IP (e.g. http://192.168.1.42:8090) when testing on Android.
 */

import PocketBase, { RecordSubscription } from 'pocketbase';
import { OperationType, handleFirestoreError } from './firebase';
export { OperationType, handleFirestoreError };

const USE_POCKETBASE = import.meta.env.VITE_DB_BACKEND === 'pocketbase';

// ---------------------------------------------------------------------------
// Re-export Firebase backend as-is when not using PocketBase
// ---------------------------------------------------------------------------
export { auth as _firebaseAuth, db as _firebaseDb } from './firebase';

// ---------------------------------------------------------------------------
// PocketBase client (only initialised when backend=pocketbase)
// ---------------------------------------------------------------------------
const PB_URL = import.meta.env.VITE_PB_URL ?? 'http://localhost:8090';
const pb = new PocketBase(PB_URL);

// Keep the PocketBase auth token in localStorage so sessions survive reloads
pb.authStore.loadFromCookie(document.cookie);

// ---------------------------------------------------------------------------
// Shared types that mirror the Firestore API surface used in App.tsx
// ---------------------------------------------------------------------------

/** Opaque handle for "doc(db, collection, id)" */
export interface DocRef {
  readonly _kind: 'doc';
  readonly collection: string;
  readonly id: string;
}

/** Opaque handle for "collection(db, name)" */
export interface CollRef {
  readonly _kind: 'coll';
  readonly collection: string;
}

/** A single equality filter produced by where() */
export interface WhereClause {
  field: string;
  op: '==' | '!=' | '<' | '<=' | '>' | '>=';
  value: unknown;
}

/** Opaque handle for "query(ref, ...where())" */
export interface QueryRef {
  readonly _kind: 'query';
  readonly collection: string;
  readonly filters: WhereClause[];
}

export interface DocumentSnapshot {
  exists(): boolean;
  data(): Record<string, unknown> | undefined;
  readonly id: string;
}

export interface QuerySnapshot {
  readonly docs: ReadonlyArray<{ id: string; data(): Record<string, unknown> }>;
}

/** Minimal User shape used in App.tsx */
export interface AuthUser {
  uid: string;
  email: string | null;
}

// ---------------------------------------------------------------------------
// Builder functions — same signatures as Firestore
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function doc(_db: any, collection: string, id: string): DocRef {
  return { _kind: 'doc', collection, id };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function collection(_db: any, name: string): CollRef {
  return { _kind: 'coll', collection: name };
}

export function where(
  field: string,
  op: '==' | '!=' | '<' | '<=' | '>' | '>=',
  value: unknown,
): WhereClause {
  return { field, op, value };
}

export function query(ref: CollRef, ...clauses: WhereClause[]): QueryRef {
  return { _kind: 'query', collection: ref.collection, filters: clauses };
}

/** No-op shim — App.tsx imports but never uses serverTimestamp/Timestamp */
export const serverTimestamp = () => new Date().toISOString();
export class Timestamp {
  static now() { return new Timestamp(Date.now() / 1000, 0); }
  constructor(public seconds: number, public nanoseconds: number) {}
  toDate() { return new Date(this.seconds * 1000); }
}

// ---------------------------------------------------------------------------
// CRUD operations — dispatched to Firebase or PocketBase
// ---------------------------------------------------------------------------

import { db as firebaseDb } from './firebase';
import {
  getDoc as fbGetDoc,
  setDoc as fbSetDoc,
  addDoc as fbAddDoc,
  collection as fbCollection,
  doc as fbDoc,
  onSnapshot as fbOnSnapshot,
  query as fbQuery,
  where as fbWhere,
} from 'firebase/firestore';

export const db = USE_POCKETBASE ? (null as unknown as typeof firebaseDb) : firebaseDb;

export async function getDoc(ref: DocRef): Promise<DocumentSnapshot> {
  if (!USE_POCKETBASE) {
    const snap = await fbGetDoc(fbDoc(firebaseDb, ref.collection, ref.id));
    return {
      exists: () => snap.exists(),
      data: () => snap.data() as Record<string, unknown> | undefined,
      id: ref.id,
    };
  }
  try {
    const record = await pb.collection(ref.collection).getOne(ref.id);
    return { exists: () => true, data: () => record as Record<string, unknown>, id: record.id };
  } catch {
    return { exists: () => false, data: () => undefined, id: ref.id };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function setDoc(ref: DocRef, data: Record<string, any>): Promise<void> {
  if (!USE_POCKETBASE) {
    return fbSetDoc(fbDoc(firebaseDb, ref.collection, ref.id), data);
  }
  try {
    // Try update first; if 404 (not found), create with explicit ID
    await pb.collection(ref.collection).update(ref.id, data);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      await pb.collection(ref.collection).create({ id: ref.id, ...data });
    } else {
      throw err;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addDoc(ref: CollRef, data: Record<string, any>): Promise<{ id: string }> {
  if (!USE_POCKETBASE) {
    const docRef = await fbAddDoc(fbCollection(firebaseDb, ref.collection), data);
    return { id: docRef.id };
  }
  const record = await pb.collection(ref.collection).create(data);
  return { id: record.id };
}

/**
 * onSnapshot — real-time listener.
 *
 * Firebase: native listener.
 * PocketBase: initial fetch + subscribe for changes, re-fetches full
 *   filtered list on each change event (same semantics as Firestore snapshot).
 */
export function onSnapshot(
  ref: QueryRef,
  callback: (snap: QuerySnapshot) => void,
  onError?: (err: Error) => void,
): () => void {
  if (!USE_POCKETBASE) {
    const fbFilters = ref.filters.map(f =>
      fbWhere(f.field, f.op as Parameters<typeof fbWhere>[1], f.value),
    );
    const q = fbQuery(fbCollection(firebaseDb, ref.collection), ...fbFilters);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fbOnSnapshot(q, callback as any, onError);
  }

  // Build PocketBase filter string
  const pbFilter = ref.filters
    .map(f => {
      const v = typeof f.value === 'string' ? `"${f.value}"` : String(f.value);
      const op = f.op === '==' ? '=' : f.op;
      return `${f.field} ${op} ${v}`;
    })
    .join(' && ');

  let cancelled = false;
  let unsubscribePB: (() => void) | null = null;

  const fetchAndNotify = async () => {
    if (cancelled) return;
    try {
      const result = await pb.collection(ref.collection).getList(1, 500, {
        filter: pbFilter,
      });
      if (!cancelled) {
        callback({
          docs: result.items.map(r => ({ id: r.id, data: () => r as Record<string, unknown> })),
        });
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Initial fetch
  fetchAndNotify();

  // Subscribe to real-time changes (re-fetch on any change)
  pb.collection(ref.collection)
    .subscribe('*', (_event: RecordSubscription) => { fetchAndNotify(); })
    .then(unsub => { unsubscribePB = unsub; })
    .catch(err => onError?.(err instanceof Error ? err : new Error(String(err))));

  return () => {
    cancelled = true;
    unsubscribePB?.();
    pb.collection(ref.collection).unsubscribe('*').catch(() => {});
  };
}

// ---------------------------------------------------------------------------
// Auth — dispatched to Firebase or PocketBase
// ---------------------------------------------------------------------------

import {
  getAuth,
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbCreateUser,
  signOut as fbSignOut,
} from 'firebase/auth';

const firebaseAuth = getAuth();

/** Minimal auth object — passed through to Firebase functions as-is */
export const auth = USE_POCKETBASE
  ? ({} as ReturnType<typeof getAuth>)   // unused placeholder for PocketBase path
  : firebaseAuth;

export function onAuthStateChanged(
  _auth: unknown,
  callback: (user: AuthUser | null) => void,
): () => void {
  if (!USE_POCKETBASE) {
    return fbOnAuthStateChanged(firebaseAuth, callback as Parameters<typeof fbOnAuthStateChanged>[1]);
  }

  // PocketBase: emit current state immediately, then listen for changes
  const emit = () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      callback({ uid: pb.authStore.record.id as string, email: pb.authStore.record['email'] as string ?? null });
    } else {
      callback(null);
    }
  };
  emit();
  return pb.authStore.onChange(emit, true);
}

export async function signInWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string,
): Promise<{ user: AuthUser }> {
  if (!USE_POCKETBASE) {
    const cred = await fbSignIn(firebaseAuth, email, password);
    return { user: { uid: cred.user.uid, email: cred.user.email } };
  }
  const result = await pb.collection('users').authWithPassword(email, password);
  return { user: { uid: result.record.id, email: result.record['email'] as string ?? null } };
}

export async function createUserWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string,
): Promise<{ user: AuthUser }> {
  if (!USE_POCKETBASE) {
    const cred = await fbCreateUser(firebaseAuth, email, password);
    return { user: { uid: cred.user.uid, email: cred.user.email } };
  }
  const record = await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    emailVisibility: true,
  });
  // Auto sign-in after registration
  await pb.collection('users').authWithPassword(email, password);
  return { user: { uid: record.id, email: record['email'] as string ?? null } };
}

export async function signOut(_auth: unknown): Promise<void> {
  if (!USE_POCKETBASE) {
    return fbSignOut(firebaseAuth);
  }
  pb.authStore.clear();
}

// Re-export User type (Firebase shape — PocketBase path uses AuthUser above)
export type { User } from 'firebase/auth';
