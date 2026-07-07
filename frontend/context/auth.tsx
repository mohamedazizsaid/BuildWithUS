'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { auth, isEmbedMode, getEmbedToken, decodeJwtPayload } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  tenant_id: string;
  tenant_name: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  // Whether the user has already been through the first-run onboarding tour.
  first_log?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  // redirectTo lets the paid-plan funnel land on /checkout after signup
  // instead of the default /dashboard.
  register: (data: { tenantName: string; email: string; password: string; firstName: string; lastName: string }, redirectTo?: string) => Promise<void>;
  acceptInvite: (data: { token: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  // Flip first_log → true locally and persist it. Called when the onboarding
  // tour launches so it never auto-shows again (even after a refresh).
  markFirstLogSeen: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Derive a stubbed user object from the embed M2M / integration-session JWT.
// Returns null when no embed token is active.
function deriveEmbedUser(): User | null {
  if (!isEmbedMode()) return null;
  const tok = getEmbedToken();
  const claims = tok ? decodeJwtPayload(tok) : null;
  const tenantId = (claims?.tenantId ?? claims?.tenant_id ?? claims?.sub ?? '') as string;
  const isIntegrationSession = (claims?.type ?? '') === 'integration_session';
  return {
    id: isIntegrationSession ? 'integration-session' : 'embed-m2m',
    tenant_id: tenantId,
    tenant_name: isIntegrationSession ? 'Session intégration' : 'Embedded session',
    email: isIntegrationSession ? '' : 'embed@m2m',
    first_name: isIntegrationSession ? 'Intégration' : 'Embed',
    last_name: 'Session',
    role: isIntegrationSession ? 'editor' : 'm2m',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // On app load, check if user is already logged in (cookie exists).
  // In embed mode we have no cookie session — we have an M2M JWT. Stub a
  // user object from the JWT claims so the dashboard chrome can render
  // without needing /auth/me to succeed.
  useEffect(() => {
    const embedUser = deriveEmbedUser();
    if (embedUser) {
      // Synchronous setState here is intentional. The embed user is derived from
      // sessionStorage (client-only), which is invisible during SSR, and the token
      // is written right after the /embed page mounts — so this can only run as a
      // post-mount sync, not a render-time initializer (that would break hydration).
      /* eslint-disable react-hooks/set-state-in-effect */
      setUser(embedUser);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    auth.getMe()
      .then((data) => setUser({ ...data.user, tenant_name: data.tenant_name }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Integration sessions opened via /s/<token> (redirect, not iframe) set the
  // embed token ASYNC — after the session exchange network call, i.e. AFTER this
  // provider already mounted and ran the getMe() path above (user=null, because
  // there is no cookie). setEmbedToken() is a module variable (no re-render), so
  // the mount effect never sees the token. Re-derive the embed user on navigation
  // once the token is present. Without this, the dashboard renders blank
  // (`if (!user) return null`) for redirect-based integration sessions.
  useEffect(() => {
    if (user) return;
    const embedUser = deriveEmbedUser();
    if (embedUser) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setUser(embedUser);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [pathname, user]);

  const login = async (email: string, password: string) => {
    await auth.login({ email, password });
    const me = await auth.getMe();
    setUser({ ...me.user, tenant_name: me.tenant_name });
    router.push('/dashboard');
  };

  const register = async (body: { tenantName: string; email: string; password: string; firstName: string; lastName: string }, redirectTo = '/dashboard') => {
    await auth.register(body);
    const me = await auth.getMe();
    setUser({ ...me.user, tenant_name: me.tenant_name });
    router.push(redirectTo);
  };

  const acceptInvite = async (body: { token: string; password: string; firstName: string; lastName: string }) => {
    const data = await auth.acceptInvite(body);
    setUser(data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
    router.push('/login');
  };

  // Optimistically mark the tour as seen, then persist. We don't await/refetch:
  // the JWT doesn't carry first_log and /me is only fetched once on load, so the
  // local flip is the source of truth for this session; the PUT makes it stick.
  const markFirstLogSeen = useCallback(() => {
    setUser((prev) => (prev && !prev.first_log ? { ...prev, first_log: true } : prev));
    auth.markFirstLogged().catch(() => { /* non-blocking; tour still ran */ });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, acceptInvite, logout, markFirstLogSeen }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
