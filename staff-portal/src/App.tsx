import React, { useState, useEffect, useCallback } from 'react';
import { pb, staffLogin, staffLogout, currentStaff, onAuthChange, startActivityWatcher } from './pb';
import type { StaffUser, Agency } from './types';
import { GovButton, GovInput, GovCard, GovBadge } from './components/UI';
import { Shield, Eye, EyeOff, AlertCircle, Loader2, LogOut } from 'lucide-react';
import LHDBPortal    from './portals/LHDBPortal';
import MarinePortal  from './portals/MarinePortal';
import MetroPortal   from './portals/MetroPortal';
import LHSPortal     from './portals/LHSPortal';

// ---------------------------------------------------------------------------
// SSO Login Screen
// ---------------------------------------------------------------------------

function LoginScreen({ onLogin }: { onLogin: (staff: StaffUser) => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const staff = await staffLogin(email, password);
      onLogin(staff);
    } catch {
      setError('Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f1f35 100%)' }}>
      <div className="w-full max-w-md">
        {/* Lennox Government branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/20 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lennox Government</h1>
          <p className="text-white/60 text-sm mt-1 font-medium tracking-widest uppercase">Staff Portal · Single Sign-On</p>
        </div>

        <GovCard className="p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <GovInput
                label="Government Email"
                type="email"
                placeholder="name@lennox.gov"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="relative">
              <GovInput
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <GovButton type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Authenticating…</> : 'Sign In to Portal'}
            </GovButton>
          </form>

          <p className="mt-6 text-xs text-center text-gray-400">
            Access restricted to authorised Lennox Government personnel.<br />
            Session will expire after 30 minutes of inactivity.
          </p>
        </GovCard>

        <p className="text-center text-white/30 text-xs mt-6">
          Republic of Lennox · Government Digital Services · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session-expired banner
// ---------------------------------------------------------------------------

function SessionExpiredBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <GovCard className="p-8 max-w-sm w-full text-center shadow-2xl">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Session Expired</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your session has timed out after 30 minutes of inactivity. Please sign in again.
        </p>
        <GovButton className="w-full" onClick={onDismiss}>Return to Login</GovButton>
      </GovCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portal router — maps agency → component
// ---------------------------------------------------------------------------

const PORTAL_MAP: Record<Agency, React.ComponentType<{ staff: StaffUser }>> = {
  lhdb:   LHDBPortal,
  marine: MarinePortal,
  metro:  MetroPortal,
  lhs:    LHSPortal,
  admin:  LHDBPortal,   // admins default to LHDB overview
};

const AGENCY_LABELS: Record<Agency, string> = {
  lhdb:   'Lennox Housing',
  marine: 'Lennox Marine',
  metro:  'Lennox Metro',
  lhs:    'Lennox Health Service',
  admin:  'Government Admin',
};

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [staff, setStaff]           = useState<StaffUser | null>(null);
  const [loading, setLoading]       = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const handleExpired = useCallback(() => {
    setSessionExpired(true);
    setStaff(null);
  }, []);

  // Restore session on load
  useEffect(() => {
    const existing = currentStaff();
    if (existing) setStaff(existing);
    setLoading(false);

    return onAuthChange(s => {
      if (!s && staff) handleExpired();
      else setStaff(s);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Activity watcher — only active when a staff member is logged in
  useEffect(() => {
    if (!staff) return;
    return startActivityWatcher(handleExpired);
  }, [staff, handleExpired]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1e3a5f' }}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!staff) {
    return (
      <>
        <LoginScreen onLogin={s => { setSessionExpired(false); setStaff(s); }} />
        {sessionExpired && <SessionExpiredBanner onDismiss={() => setSessionExpired(false)} />}
      </>
    );
  }

  const Portal = PORTAL_MAP[staff.agency] ?? LHDBPortal;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Global top bar */}
      <header className="h-12 flex items-center justify-between px-6 text-white text-sm shrink-0"
        style={{ background: 'var(--gov-navy)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 opacity-60" />
          <span className="font-semibold tracking-wide">Lennox Government</span>
          <span className="opacity-40">·</span>
          <span className="opacity-70">{AGENCY_LABELS[staff.agency]}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="opacity-60 text-xs">
            {staff.firstName} {staff.lastName}
            <GovBadge variant={staff.role === 'admin' ? 'danger' : staff.role === 'manager' ? 'warning' : 'default'} className="ml-2">
              {staff.role}
            </GovBadge>
          </span>
          <button
            onClick={() => { staffLogout(); setStaff(null); }}
            className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity text-xs"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      {/* Agency portal */}
      <div className="flex-1 overflow-hidden">
        <Portal staff={staff} />
      </div>
    </div>
  );
}
