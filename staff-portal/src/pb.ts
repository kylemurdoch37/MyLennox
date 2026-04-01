/// <reference types="vite/client" />
import PocketBase from 'pocketbase';
import type { StaffUser } from './types';

const PB_URL = import.meta.env.VITE_PB_URL ?? 'http://localhost:8090';

export const pb = new PocketBase(PB_URL);

// Persist session across page reloads
pb.authStore.loadFromCookie(document.cookie);
pb.authStore.onChange(() => {
  document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function staffLogin(email: string, password: string): Promise<StaffUser> {
  const result = await pb.collection('staff').authWithPassword(email, password);
  const r = result.record;
  return recordToStaff(r);
}

export function staffLogout(): void {
  pb.authStore.clear();
}

export function currentStaff(): StaffUser | null {
  if (!pb.authStore.isValid || !pb.authStore.record) return null;
  return recordToStaff(pb.authStore.record);
}

export function onAuthChange(cb: (staff: StaffUser | null) => void): () => void {
  return pb.authStore.onChange(() => {
    cb(currentStaff());
  }, true);
}

function recordToStaff(r: Record<string, unknown>): StaffUser {
  return {
    id:         r['id'] as string,
    email:      r['email'] as string,
    firstName:  r['firstName'] as string ?? '',
    lastName:   r['lastName'] as string ?? '',
    agency:     r['agency'] as StaffUser['agency'],
    role:       r['role'] as StaffUser['role'] ?? 'staff',
    department: r['department'] as string ?? '',
    lastLogin:  r['lastLogin'] as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// Session timeout — auto-logout after 30 minutes of inactivity
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 30 * 60 * 1000;
let logoutTimer: ReturnType<typeof setTimeout> | null = null;

export function resetSessionTimer(onExpire: () => void): void {
  if (logoutTimer) clearTimeout(logoutTimer);
  logoutTimer = setTimeout(() => {
    pb.authStore.clear();
    onExpire();
  }, TIMEOUT_MS);
}

export function clearSessionTimer(): void {
  if (logoutTimer) { clearTimeout(logoutTimer); logoutTimer = null; }
}

// Activity events that reset the session timer
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

export function startActivityWatcher(onExpire: () => void): () => void {
  const handler = () => resetSessionTimer(onExpire);
  ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handler, { passive: true }));
  resetSessionTimer(onExpire);
  return () => {
    ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handler));
    clearSessionTimer();
  };
}
